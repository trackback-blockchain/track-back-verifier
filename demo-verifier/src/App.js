import { useEffect, useState } from 'react';
import moment from 'moment';
import './App.css';
var QRCode = require('qrcode.react');


async function getSharedVCPS() {
  const response = await fetch("http://localhost:3500/api/v1/vcp")
  return await response.json()
}

function App() {

  const [data, setData] = useState([])

  useEffect(() => {
    const interval = setInterval(() => {
      getSharedVCPS().then((data) => {
        console.log(data)
        if (!data) return;
        data.vcps.sort((a, b) => {
          return new Date(b.datetime) - new Date(a.datetime);
        })
        setData(data)
      })
    }, 1000);

    return () => clearInterval(interval);
  }, []);
  return (

    <div className="App">
      <div className="App-title">TrackBack™ Verifier</div>
      <div className="App-header">
        <QRCode value="https://60b22e7974f1.ngrok.io/api/v1/vcp" size={500} />
        {/* <QRCode value="https://a684b174e0d5.ngrok.io/api/v1/vcp" size={500} className="QR-Scanner"/> */}
      </div>
      <div className="details">
        <div className="verifiedCredentials">
          Verified credentials
        </div>
        <div className="tableContainer">

          <table  className="styled-table">
            <tr>
              <th>Claim</th>
              <th>Date</th>
              <th>Verified</th>
            </tr>
            {(data.vcps || []).map(({ vcp, datetime, vcVerified }) => {
              return <tr>
                <td>
                  <table className="styled-table2">
                    <tr>
                      <td>
                        Given Name
                      </td>
                      <td>
                        {vcp.givenName}
                      </td>
                    </tr>
                    <tr>
                      <td>
                        Family Name
                      </td>
                      <td>
                        {vcp.familyName}
                      </td>
                    </tr>
                    {vcp.bloodType && (
                      <tr>
                        <td>
                          Blood Type
                        </td>
                        <td>
                          {vcp.bloodType || "N/A"}
                        </td>
                      </tr>

                    )}

                  </table>
                </td>
                <td>{moment((datetime)).format()}</td>
                <td>{vcVerified ? "Yes" : "No"}</td>
              </tr>
            })}
          </table>

        </div>

      </div>
    </div>
  );
}

export default App;
