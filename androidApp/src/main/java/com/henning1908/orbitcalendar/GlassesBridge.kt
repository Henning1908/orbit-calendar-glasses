package com.henning1908.orbitcalendar

import android.app.Activity
import android.content.Context
import android.util.Log
import com.meta.wearable.dat.core.Wearables
import com.meta.wearable.dat.core.selectors.AutoDeviceSelector
import com.meta.wearable.dat.core.session.DeviceSession
import com.meta.wearable.dat.core.session.DeviceSessionState
import com.meta.wearable.dat.core.types.DeviceSessionError
import com.meta.wearable.dat.core.types.RegistrationState
import com.meta.wearable.dat.display.Display
import com.meta.wearable.dat.display.addDisplay
import com.meta.wearable.dat.display.removeDisplay
import com.meta.wearable.dat.display.types.DisplayState
import com.meta.wearable.dat.display.views.Direction
import com.meta.wearable.dat.display.views.FlexBoxBackground
import com.meta.wearable.dat.display.views.TextColor
import com.meta.wearable.dat.display.views.TextStyle
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

/**
 * Phone-side boundary for Meta Wearables Device Access Toolkit integration.
 *
 * Calendar access is independent from the wearable SDK: DAVx5 -> Android
 * Calendar Provider -> this repository -> this bridge -> glasses.
 */
interface GlassesBridge {
    fun publish(snapshot: CalendarSnapshot)
}

class NoOpGlassesBridge : GlassesBridge {
    override fun publish(snapshot: CalendarSnapshot) = Unit
}

class MetaGlassesBridge(
    private val context: Context,
    private val scope: CoroutineScope,
) : GlassesBridge {
    private companion object {
        const val TAG = "MetaGlassesBridge"
    }

    private var session: DeviceSession? = null
    private var display: Display? = null
    private var sessionJob: Job? = null
    private var displayJob: Job? = null
    private var pendingSnapshot: CalendarSnapshot? = null

    fun initialize() {
        Wearables.initialize(context)
    }

    fun startRegistration(activity: Activity) {
        if (Wearables.registrationState.value != RegistrationState.REGISTERED) {
            Wearables.startRegistration(activity)
        }
    }

    fun connect() {
        if (Wearables.registrationState.value != RegistrationState.REGISTERED) {
            Log.w(TAG, "Meta registration is required before connecting glasses")
            return
        }
        if (session != null) return

        Wearables.createSession(AutoDeviceSelector(filter = { it.isDisplayCapable() }))
            .fold(
                onSuccess = { newSession ->
                    session = newSession
                    sessionJob = scope.launch(Dispatchers.IO) {
                        newSession.errors.collectLatest { error ->
                            Log.e(TAG, "Glasses session error: ${error.description}")
                            if (error == DeviceSessionError.DAT_APP_ON_THE_GLASSES_UPDATE_REQUIRED) {
                                Log.e(TAG, "Update the DAT app on the glasses before reconnecting")
                            }
                        }
                    }
                    scope.launch {
                        newSession.state.collectLatest { state ->
                            if (state == DeviceSessionState.STARTED && display == null) attachDisplay(newSession)
                            if (state == DeviceSessionState.STOPPED) disconnect()
                        }
                    }
                    newSession.start()
                },
                onFailure = { error, _ -> Log.e(TAG, "Could not create glasses session: ${error.description}") },
            )
    }

    override fun publish(snapshot: CalendarSnapshot) {
        pendingSnapshot = snapshot
        scope.launch {
            sendPendingSnapshot()
        }
    }

    fun disconnect() {
        displayJob?.cancel()
        sessionJob?.cancel()
        display?.let { session?.removeDisplay() }
        session?.stop()
        display = null
        session = null
    }

    private fun attachDisplay(currentSession: DeviceSession) {
        currentSession.addDisplay().fold(
            onSuccess = { newDisplay ->
                display = newDisplay
                displayJob = scope.launch {
                    newDisplay.state.collectLatest { state ->
                        if (state == DisplayState.STARTED) sendPendingSnapshot()
                    }
                }
            },
            onFailure = { error, _ -> Log.e(TAG, "Could not attach display: ${error.description}") },
        )
    }

    private suspend fun sendPendingSnapshot() {
        val currentDisplay = display ?: return
        val snapshot = pendingSnapshot ?: return
        val upcoming = snapshot.events.take(3)
        currentDisplay.sendContent {
            flexBox(direction = Direction.COLUMN, gap = 10, padding = 18, background = FlexBoxBackground.CARD) {
                text("ORBIT CALENDAR", style = TextStyle.HEADING)
                if (upcoming.isEmpty()) {
                    text("No plans in the next 30 days", style = TextStyle.BODY, color = TextColor.SECONDARY)
                } else {
                    upcoming.forEach { event ->
                        flexBox(direction = Direction.COLUMN, gap = 2) {
                            text(event.title, style = TextStyle.BODY)
                            text(event.calendarName, style = TextStyle.META, color = TextColor.SECONDARY)
                        }
                    }
                }
            }
        }.onFailure { error, _ ->
            Log.e(TAG, "Could not send calendar to glasses: ${error.description}")
        }
    }
}
