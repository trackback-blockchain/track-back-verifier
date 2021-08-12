import logo from './logo.svg';
import './App.css';
var QRCode = require('qrcode.react');

function App() {
  return (
    <div className="App">
      <header className="App-header">
      <QRCode value="https://trackback.co.nz/" />
      </header>
    </div>
  );
}

export default App;
