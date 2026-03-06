import { useEffect } from "react";

/**
 * Custom hook để phát hiện khi người dùng click bên ngoài element
 * @param {React.Ref} ref - Ref của element cần giám sát
 * @param {Function} callback - Hàm được gọi khi click bên ngoài
 */
export function useClickOutside(ref, callback) {
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        callback();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ref, callback]);
}
