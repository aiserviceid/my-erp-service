const ATTENDANCE_PREFIX = 'ATTENDANCE_EMP_';

export const getLocalDateKey = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getAttendanceSchedule = (settings = {}) => ({
  start: settings.attendance_start_time || '08:00',
  end: settings.attendance_end_time || '17:00',
  toleranceMinutes: Math.max(0, Number(settings.attendance_late_tolerance || 10)),
});

export const getEmployeeAttendance = (transactions = [], employeeId, dateKey = getLocalDateKey()) => {
  const records = transactions
    .filter((transaction) => (
      transaction.description === `${ATTENDANCE_PREFIX}${employeeId}`
      && getLocalDateKey(transaction.created_at) === dateKey
    ))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  return {
    records,
    checkIn: records.find((record) => record.type === 'ATTENDANCE_IN') || null,
    checkOut: [...records].reverse().find((record) => record.type === 'ATTENDANCE_OUT') || null,
  };
};

export const getAttendanceStatus = (attendance, schedule, dateKey = getLocalDateKey()) => {
  if (!attendance?.checkIn) return { key: 'absent', label: 'Belum Hadir' };
  if (attendance.checkOut) return { key: 'completed', label: 'Selesai Shift' };

  const checkIn = new Date(attendance.checkIn.created_at);
  const [hour, minute] = String(schedule.start || '08:00').split(':').map(Number);
  const deadline = new Date(`${dateKey}T00:00:00`);
  deadline.setHours(hour || 0, (minute || 0) + Number(schedule.toleranceMinutes || 0), 0, 0);
  return checkIn > deadline
    ? { key: 'late', label: 'Terlambat' }
    : { key: 'working', label: 'Sedang Bekerja' };
};

export const getWorkDurationMinutes = (attendance, now = new Date()) => {
  if (!attendance?.checkIn) return 0;
  const start = new Date(attendance.checkIn.created_at);
  const end = attendance.checkOut ? new Date(attendance.checkOut.created_at) : now;
  return Math.max(0, Math.floor((end - start) / 60000));
};

export const formatWorkDuration = (minutes = 0) => {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours}j ${remainder}m` : `${remainder}m`;
};

export const formatAttendanceTime = (value) => value
  ? new Date(value).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  : '-';
