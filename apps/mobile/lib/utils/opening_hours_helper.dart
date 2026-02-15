class OpeningHoursHelper {
  static String getCurrentStatus(Map<String, dynamic>? openingHours) {
    if (openingHours == null) return 'Hours not available';

    final now = DateTime.now();
    final dayOfWeek = _getDayName(now.weekday);
    final currentTime = _TimeOfDay.fromDateTime(now);

    final dayHours = openingHours[dayOfWeek];
    if (dayHours == null) return 'Closed today';

    // Handle new array structure: dayHours is a List of time slots
    if (dayHours is List) {
      // Check all time slots to see if current time falls within any
      for (var slot in dayHours) {
        if (slot is Map) {
          final open = slot['open'] as String?;
          final close = slot['close'] as String?;

          if (open != null && close != null) {
            final openTime = _parseTime(open);
            final closeTime = _parseTime(close);

            if (openTime != null && closeTime != null) {
              if (_isTimeBetween(currentTime, openTime, closeTime)) {
                return _formatClosingTime(close);
              }
            }
          }
        }
      }
      // If we get here, current time doesn't fall within any slot
      return 'Closed';
    }

    // Handle legacy structure: dayHours is a Map with open/close directly
    if (dayHours is Map) {
      final open = dayHours['open'] as String?;
      final close = dayHours['close'] as String?;

      if (open == null || close == null) return 'Hours not available';

      final openTime = _parseTime(open);
      final closeTime = _parseTime(close);

      if (openTime == null || closeTime == null) return 'Hours not available';

      if (_isTimeBetween(currentTime, openTime, closeTime)) {
        return _formatClosingTime(close);
      } else {
        return 'Closed';
      }
    }

    return 'Hours not available';
  }

  static String _getDayName(int weekday) {
    const days = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday'
    ];
    return days[weekday - 1];
  }

  static _TimeOfDay? _parseTime(String time) {
    try {
      final parts = time.split(':');
      if (parts.length == 2) {
        return _TimeOfDay(
          hour: int.parse(parts[0]),
          minute: int.parse(parts[1]),
        );
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  static bool _isTimeBetween(_TimeOfDay current, _TimeOfDay start, _TimeOfDay end) {
    final currentMinutes = current.hour * 60 + current.minute;
    final startMinutes = start.hour * 60 + start.minute;
    final endMinutes = end.hour * 60 + end.minute;

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      // Handles overnight hours (e.g., 22:00 - 02:00)
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
  }

  /// Format closing time from 24-hour format (e.g., "22:00") to "closes 10pm" format
  static String _formatClosingTime(String time24Hour) {
    try {
      final parts = time24Hour.split(':');
      if (parts.length == 2) {
        final hour = int.parse(parts[0]);
        final minute = int.parse(parts[1]);
        final period = hour >= 12 ? 'pm' : 'am';
        final displayHour = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour);
        
        if (minute == 0) {
          return 'closes $displayHour$period';
        } else {
          return 'closes $displayHour:${minute.toString().padLeft(2, '0')}$period';
        }
      }
    } catch (e) {
      // If parsing fails, return as-is with "closes" prefix
      return 'closes $time24Hour';
    }
    
    return 'closes $time24Hour';
  }
}

class _TimeOfDay {
  final int hour;
  final int minute;

  _TimeOfDay({required this.hour, required this.minute});

  factory _TimeOfDay.fromDateTime(DateTime dateTime) {
    return _TimeOfDay(hour: dateTime.hour, minute: dateTime.minute);
  }
}

