import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Editor } from './components/Editor';
import { Visualizer } from './components/Visualizer';

function App() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-background text-foreground">
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
  );
}

export default App;
