import './App.css';
var QRCode = require('qrcode.react');

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <QRCode value="https://verifier.trackback.dev/api/v1/vcp" size={400} />
      </header>
      <div className="details"></div>
    </div>
  );
}

export default App;
