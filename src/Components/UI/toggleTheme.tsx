// ⬅️ tiny SVG icons (≈1 kB each)
import useTheme from '../../hooks/useTheme';
import { MdOutlineWbSunny } from "react-icons/md";
import { LuMoonStar } from "react-icons/lu";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button

      onClick={toggleTheme}
      aria-label="Toggle dark / light mode"
    >
      {theme === 'dark' ? <MdOutlineWbSunny className=" text-lg  " /> : <LuMoonStar className=" text-lg" />}
    </button>
  );
} 