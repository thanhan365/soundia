/**
 * Format thời gian (giây) thành MM:SS
 * @param {number} seconds - Số giây
 * @returns {string} Chuỗi định dạng "MM:SS"
 */
export function formatTime(seconds) {
  if (!seconds) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Format tổng thời lượng (giây) thành chuỗi tính toán
 * @param {number} totalSeconds - Tổng số giây
 * @returns {string} Chuỗi định dạng "MM:SS"
 */
export function formatTotalDuration(totalSeconds) {
  return formatTime(totalSeconds);
}

/**
 * Format thời gian để hiển thị (hỗ trợ giờ:phút:giây)
 * @param {number} seconds - Số giây
 * @returns {string} Chuỗi định dạng "HH:MM:SS" hoặc "MM:SS"
 */
export function formatDuration(seconds) {
  if (!seconds) return "0:00";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}
