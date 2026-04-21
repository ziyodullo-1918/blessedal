import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";

export function ThemeToggle() {
  const { resolved, toggle } = useTheme();
  const isDark = resolved === "dark";
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      title={isDark ? "Yorug' rejim" : "Tungi rejim"}
      aria-label="Mavzuni almashtirish"
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}