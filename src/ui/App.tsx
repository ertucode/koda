import "./App.css";
import { FlexLayoutManager } from "./features/tile-manager";
import { ConfirmationProvider } from "./lib/hooks/useConfirmation";
import { ToastProvider } from "./lib/components/toast";

function App() {
  return (
    <ToastProvider>
      <ConfirmationProvider>
        <FlexLayoutManager />
      </ConfirmationProvider>
    </ToastProvider>
  );
}

export default App;
