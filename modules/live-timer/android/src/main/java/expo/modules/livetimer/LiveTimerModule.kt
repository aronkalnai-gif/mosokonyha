package expo.modules.livetimer

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Ongoing notifications with a live countdown (Android chronometer). They are
 * visible on the lock screen and keep ticking without the app running.
 */
class LiveTimerModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("LiveTimer")

    // Shows (or updates) countdown notification `id`, counting down to `endsAtMs`
    // (epoch millis). If `removeAtEnd` is false the chronometer keeps going into
    // negative time, which is what we want for the key's overtime.
    Function("show") { id: Int, title: String, body: String, endsAtMs: Double, removeAtEnd: Boolean ->
      show(id, title, body, endsAtMs.toLong(), removeAtEnd)
    }

    Function("cancel") { id: Int ->
      NotificationManagerCompat.from(context).cancel(TAG, id)
    }
  }

  private fun show(id: Int, title: String, body: String, endsAt: Long, removeAtEnd: Boolean): Boolean {
    val ctx = context
    val manager = NotificationManagerCompat.from(ctx)
    if (!manager.areNotificationsEnabled()) return false
    ensureChannel(ctx)

    val launch = ctx.packageManager.getLaunchIntentForPackage(ctx.packageName)
    val contentIntent = launch?.let {
      PendingIntent.getActivity(ctx, id, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }

    val iconRes = ctx.resources.getIdentifier("notification_icon", "drawable", ctx.packageName)
      .takeIf { it != 0 } ?: ctx.applicationInfo.icon

    val builder = NotificationCompat.Builder(ctx, CHANNEL_ID)
      .setSmallIcon(iconRes)
      .setContentTitle(title)
      .setContentText(body)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setSilent(true)
      .setShowWhen(true)
      .setWhen(endsAt)
      .setUsesChronometer(true)
      .setChronometerCountDown(true)
      .setCategory(NotificationCompat.CATEGORY_STOPWATCH)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setPriority(NotificationCompat.PRIORITY_DEFAULT)
      .setContentIntent(contentIntent)

    if (removeAtEnd) {
      val remaining = endsAt - System.currentTimeMillis()
      if (remaining <= 0) {
        manager.cancel(TAG, id)
        return true
      }
      builder.setTimeoutAfter(remaining)
    }

    return try {
      manager.notify(TAG, id, builder.build())
      true
    } catch (e: SecurityException) {
      false
    }
  }

  private fun ensureChannel(ctx: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (nm.getNotificationChannel(CHANNEL_ID) != null) return
    val channel = NotificationChannel(CHANNEL_ID, "Visszaszámlálók / Countdowns", NotificationManager.IMPORTANCE_LOW).apply {
      description = "Kulcs és gépek hátralévő ideje / Key and machine timers"
      lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
      setShowBadge(false)
    }
    nm.createNotificationChannel(channel)
  }

  companion object {
    private const val TAG = "live-timer"
    private const val CHANNEL_ID = "live-timers"
  }
}
