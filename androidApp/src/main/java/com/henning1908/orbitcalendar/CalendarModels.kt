package com.henning1908.orbitcalendar

data class CalendarEvent(
    val title: String,
    val startMillis: Long,
    val endMillis: Long,
    val calendarName: String,
    val accountName: String,
)

data class CalendarSnapshot(
    val events: List<CalendarEvent>,
    val syncedCalendars: Int,
)
