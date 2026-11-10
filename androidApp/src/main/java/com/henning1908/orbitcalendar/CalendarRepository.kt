package com.henning1908.orbitcalendar

import android.Manifest
import android.content.ContentResolver
import android.content.Context
import android.content.pm.PackageManager
import android.provider.CalendarContract
import androidx.core.content.ContextCompat
import java.util.Calendar

class CalendarRepository(private val context: Context) {
    fun canRead(): Boolean =
        ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CALENDAR) ==
            PackageManager.PERMISSION_GRANTED

    fun loadUpcoming(daysAhead: Int = 30): CalendarSnapshot {
        if (!canRead()) return CalendarSnapshot(emptyList(), 0)

        val now = System.currentTimeMillis()
        val end = Calendar.getInstance().apply {
            timeInMillis = now
            add(Calendar.DAY_OF_YEAR, daysAhead)
        }.timeInMillis

        val calendars = mutableMapOf<Long, Pair<String, String>>()
        context.contentResolver.query(
            CalendarContract.Calendars.CONTENT_URI,
            arrayOf(
                CalendarContract.Calendars._ID,
                CalendarContract.Calendars.CALENDAR_DISPLAY_NAME,
                CalendarContract.Calendars.ACCOUNT_NAME,
            ),
            "${CalendarContract.Calendars.VISIBLE}=1",
            null,
            null,
        )?.use { cursor ->
            val idIndex = cursor.getColumnIndexOrThrow(CalendarContract.Calendars._ID)
            val nameIndex = cursor.getColumnIndexOrThrow(CalendarContract.Calendars.CALENDAR_DISPLAY_NAME)
            val accountIndex = cursor.getColumnIndexOrThrow(CalendarContract.Calendars.ACCOUNT_NAME)
            while (cursor.moveToNext()) {
                calendars[cursor.getLong(idIndex)] =
                    cursor.getString(nameIndex) to cursor.getString(accountIndex)
            }
        }

        val events = mutableListOf<CalendarEvent>()
        val builder = CalendarContract.Instances.CONTENT_URI.buildUpon()
        android.content.ContentUris.appendId(builder, now)
        android.content.ContentUris.appendId(builder, end)
        context.contentResolver.query(
            builder.build(),
            arrayOf(
                CalendarContract.Instances.TITLE,
                CalendarContract.Instances.BEGIN,
                CalendarContract.Instances.END,
                CalendarContract.Instances.CALENDAR_ID,
            ),
            null,
            null,
            "${CalendarContract.Instances.BEGIN} ASC",
        )?.use { cursor ->
            val titleIndex = cursor.getColumnIndexOrThrow(CalendarContract.Instances.TITLE)
            val beginIndex = cursor.getColumnIndexOrThrow(CalendarContract.Instances.BEGIN)
            val endIndex = cursor.getColumnIndexOrThrow(CalendarContract.Instances.END)
            val calendarIndex = cursor.getColumnIndexOrThrow(CalendarContract.Instances.CALENDAR_ID)
            while (cursor.moveToNext()) {
                val calendar = calendars[cursor.getLong(calendarIndex)] ?: continue
                events += CalendarEvent(
                    title = cursor.getString(titleIndex) ?: "(untitled)",
                    startMillis = cursor.getLong(beginIndex),
                    endMillis = cursor.getLong(endIndex),
                    calendarName = calendar.first,
                    accountName = calendar.second,
                )
            }
        }
        return CalendarSnapshot(events, calendars.size)
    }
}
