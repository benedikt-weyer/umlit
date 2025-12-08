import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Editor } from './components/Editor';
import { Visualizer } from './components/Visualizer';
import { Toolbar } from './components/Toolbar';
import { ThemeProvider } from './components/ThemeProvider';

function App() {
  return (
    <ThemeProvider>
      <div className="h-screen w-screen overflow-hidden flex flex-col">
        <Toolbar />
        <div className="flex-1 overflow-hidden">
          <PanelGroup direction="horizontal">
            <Panel defaultSize={30} minSize={20}>
              <Editor />
            </Panel>
            <PanelResizeHandle className="w-1 bg-border hover:bg-primary transition-colors" />
            <Panel minSize={30}>
              <Visualizer />
            </Panel>
          </PanelGroup>
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;
