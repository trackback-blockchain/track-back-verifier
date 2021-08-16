import './App.css';
var QRCode = require('qrcode.react');


function App() {
  return (
    
    <div className="App">
      <div className="App-title">TrackBack™ Verifier</div>
      <div className="App-header"> 
        <QRCode value="https://verifier.trackback.dev/api/v1/vcp" size={500} />
        {/* <QRCode value="https://a684b174e0d5.ngrok.io/api/v1/vcp" size={500} className="QR-Scanner"/> */}
      </div>
      <div className="details">
        <div className="sharedCredentials">
          Shared credentials
        </div>
        <div className="verifiedCredentials">
          Verified credentials
        </div>
      </div>
    </div>
  );
}

export default App;
