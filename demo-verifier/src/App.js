import { useEffect, useState } from 'react';
import moment from 'moment';
import './App.css';
var QRCode = require('qrcode.react');


async function getSharedVCPS() {
  // const response = await fetch("https://cb75d0055644.ngrok.io/api/v1/verifiable_credentials"); 
  const response = await fetch("https://verifier.trackback.dev/api/v1/verifiable_credentials")
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
      <div>
        
      </div>
      <div className="App-header">
        <QRCode value="https://verifier.trackback.dev/api/v1/vcp" size={500} />
        {/* <QRCode value="https://cb75d0055644.ngrok.io/api/v1/vcp" size={500} className="QR-Scanner"/> */}
      </div>
      <div className="details">
        <div className="verifiedCredentials">
          Verified Credentials
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
                    {vcp && (
                      <tr>
                      <td>
                        Given Name
                      </td>
                      <td>
                        {vcp.givenName}
                      </td>
                    </tr>
                    )}
                    {vcp && (
                      <tr>
                      <td>
                        Family Name
                      </td>
                      <td>
                        {vcp.familyName}
                      </td>
                    </tr>
                    )}
                    {vcp && vcp.bloodType && (
                      <tr>
                      <td>
                        Blood Type
                      </td>
                      <td>
                        {vcp.bloodType || "N/A"}
                      </td>
                    </tr>
                    )}
                    {/* <tr>
                      <td>
                        Given Name
                      </td>
                      <td>
                        {vcp.givenName}
                      </td>
                    </tr> */}
                    {/* <tr>
                      <td>
                        Family Name
                      </td>
                      <td>
                        {vcp.familyName}
                      </td>
                    </tr> */}
                    {/* {vcp.bloodType && (
                      <tr>
                        <td>
                          Blood Type
                        </td>
                        <td>
                          {vcp.bloodType || "N/A"}
                        </td>
                      </tr>

                    )} */}

                  </table>
                </td>
                {vcp && (
                  <td>{moment((datetime)).format()}</td>
                )}
                {vcp && (
                  <td>{vcVerified ? "Yes" : "No"}</td>
                )}
              </tr>
            })}
          </table>

        </div>

      </div>
    </div>
  );
}

export default App;
