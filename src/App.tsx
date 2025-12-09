import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { SourceCodeEditor } from './components/SourceCodeEditor';
import { Visualizer } from './components/diagram/Visualizer';
import { ApplicationToolbar } from './components/ApplicationToolbar';
import { ThemeContextProvider } from './components/ThemeContextProvider';

function App() {
  return (
    <ThemeContextProvider>
      <div className="h-screen w-screen overflow-hidden flex flex-col">
        <ApplicationToolbar />
        <div className="flex-1 overflow-hidden">
          <PanelGroup direction="horizontal">
            <Panel defaultSize={30} minSize={20}>
              <SourceCodeEditor />
            </Panel>
            <PanelResizeHandle className="w-1 bg-border hover:bg-primary transition-colors" />
            <Panel minSize={30}>
              <Visualizer />
            </Panel>
          </PanelGroup>
        </div>
      </div>
    </ThemeContextProvider>
  );
}

export default App;
