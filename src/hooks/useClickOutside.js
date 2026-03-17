import { useEffect } from "react";

/**
 * Custom hook để phát hiện khi người dùng click bên ngoài element
 * @param {React.Ref} ref - Ref của element cần giám sát
 * @param {Function} callback - Hàm được gọi khi click bên ngoài
 * @param {string} [excludeSelector] - CSS selector: không trigger nếu click bên trong element này
 */
export function useClickOutside(ref, callback, excludeSelector) {
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        // Skip nếu click bên trong excluded element (ví dụ portal)
        if (excludeSelector) {
          const excluded = document.querySelector(excludeSelector);
          if (excluded && excluded.contains(event.target)) return;
        }
        callback();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [ref, callback, excludeSelector]);
}
