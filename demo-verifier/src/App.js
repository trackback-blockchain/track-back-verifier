import { useEffect, useState } from 'react';
import moment from 'moment';
import './App.css';
var QRCode = require('qrcode.react');


async function getSharedVCPS() {
  // const response = await fetch("https://cb75d0055644.ngrok.io/api/v1/verifiable_credentials"); 
  const response = await fetch("/api/v1/verifiable_credentials")
  return await response.json()
}

function camelCaseToLetter(text) {
  const result = text.replace(/([A-Z])/g, " $1");
  return result.charAt(0).toUpperCase() + result.slice(1);
}

const MODE_DIA = "MODE_DIA"
const MODE_TRACKBACK = "MODE_TRACKBACK"


function getModeParams(mode) {
  if (mode === MODE_DIA) {
    return {
      title: "Trackback DIA™",
      url: "https://wallet.trackback.dev?r=https://trackback-dia.trackback.dev/api/v1/vcp/passportRequest"
    }
  } else {
    return {
      title: "Trackback Transport Authority™",
      url: "https://wallet.trackback.dev?r=https://trackback-ta.trackback.dev/api/v1/vcp/licenceRequest"
    }
  }
}

function App() {

  const [data, setData] = useState([])

  const MODE = window.location.host.indexOf("dia") > 0 ? MODE_DIA : MODE_TRACKBACK

  const params = getModeParams(MODE);

  useEffect(() => {
    const interval = setInterval(() => {
      getSharedVCPS().then((data) => {
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
      <div className="App-title">{params.title}</div>
      <div>

      </div>
      <div className="App-header">
        <QRCode value={params.url} size={500} />
        {/* <QRCode value="https://cb75d0055644.ngrok.io/api/v1/vcp" size={500} className="QR-Scanner"/> */}
      </div>
      <div className="details">
        <div className="verifiedCredentials">
          Verified Credentials
        </div>
        <div className="tableContainer">

          <table className="styled-table">
            <tr>
              <th>Claim</th>
              <th>Date</th>
              <th>Verified</th>
            </tr>
            {(data.vcps || []).map(({ vcs, datetime, vcpVerified }) => {

              return <tr>
                <td>
                  <table className="styled-table2">

                    {(vcs || []).map((vc) => {
                      const { id, valid, type, ...other } = vc
                      const keys = Object.keys(other);

                      return (
                        <tr>
                          <td>
                            {camelCaseToLetter(keys[0])}
                          </td>
                          <td>
                            {other[keys[0]]}
                          </td>
                        </tr>
                      )
                    })}
                  </table>
                </td>

                <td>{moment((datetime)).format()}</td>
                <td>{vcpVerified ? "Yes" : "No"}</td>

              </tr>
            })}
          </table>

        </div>

      </div>
    </div>
  );
}

export default App;
