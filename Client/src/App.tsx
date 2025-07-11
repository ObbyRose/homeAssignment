import { ThemeProvider } from "./components/ui/theme-provider";
import { Toaster } from "./components/ui/sonner";
import MainPage from "./pages/MainPage";

export default function App() {
	return (
		<ThemeProvider>
			<MainPage />
			<Toaster />
		</ThemeProvider>
	);
}
