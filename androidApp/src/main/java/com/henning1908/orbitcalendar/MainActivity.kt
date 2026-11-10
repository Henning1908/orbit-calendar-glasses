package com.henning1908.orbitcalendar

import android.Manifest
import android.os.Bundle
import android.provider.CalendarContract
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.henning1908.orbitcalendar.databinding.ActivityMainBinding
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.DateFormat
import java.util.Date

class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding
    private lateinit var repository: CalendarRepository
    private val glassesBridge: GlassesBridge = NoOpGlassesBridge()

    private val permissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {
            refreshCalendar()
        }

    private val calendarObserver = object : android.database.ContentObserver(android.os.Handler(mainLooper)) {
        override fun onChange(selfChange: Boolean) {
            refreshCalendar()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        repository = CalendarRepository(this)

        binding.permissionButton.setOnClickListener {
            permissionLauncher.launch(arrayOf(Manifest.permission.READ_CALENDAR))
        }
        binding.refreshButton.setOnClickListener { refreshCalendar() }
        contentResolver.registerContentObserver(CalendarContract.Instances.CONTENT_URI, true, calendarObserver)
        refreshCalendar()
    }

    override fun onDestroy() {
        contentResolver.unregisterContentObserver(calendarObserver)
        super.onDestroy()
    }

    private fun refreshCalendar() {
        if (!repository.canRead()) {
            binding.statusText.text = "DAVx5 stays signed in on your phone. Allow Orbit to read the synced Android calendar."
            binding.eventsText.text = "No calendar permission yet."
            return
        }
        lifecycleScope.launch {
            val snapshot = withContext(Dispatchers.IO) { repository.loadUpcoming() }
            glassesBridge.publish(snapshot)
            binding.statusText.text = "${snapshot.syncedCalendars} visible calendars · automatically updated from Android Calendar Provider"
            binding.eventsText.text = if (snapshot.events.isEmpty()) {
                "No upcoming events in the next 30 days."
            } else {
                snapshot.events.take(12).joinToString("\n") { event ->
                    "${DateFormat.getDateTimeInstance(DateFormat.SHORT, DateFormat.SHORT).format(Date(event.startMillis))}  ${event.title}\n${event.calendarName} · ${event.accountName}"
                }
            }
        }
    }
}
