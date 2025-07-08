import { ThemeProvider } from "./components/ui/theme-provider"
import { ModeToggle } from "./components/ui/mode-toggle"
function App() {
  return (
    <>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <ModeToggle />
        <h1 className='text-3xlfont-bold underline'>Hello World</h1>
      </ThemeProvider>
    </>
  )
}

export default App
