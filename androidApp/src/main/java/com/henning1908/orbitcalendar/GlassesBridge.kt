package com.henning1908.orbitcalendar

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
