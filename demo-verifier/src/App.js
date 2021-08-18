import { useEffect, useState } from 'react';
import moment from 'moment';
import './App.css';
var QRCode = require('qrcode.react');


async function getSharedVCPS() {
  // const response = await fetch("https://cb75d0055644.ngrok.io/api/v1/verifiable_credentials"); 
  const response = await fetch("https://verifier.trackback.dev/api/v1/verifiable_credentials")
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
      title: "DIA™ Verifier",
      url: "https://wallet.trackback.dev?r=https://verifier.trackback.dev/api/v1/vcp/licenceRequest"
    }
  } else {
    return {
      title: "TrackBack™ Verifier",
      url: "https://wallet.trackback.dev?r=https://verifier.trackback.dev/api/v1/vcp/passportRequest"
    }
  }
}

function App() {

  const [data, setData] = useState([])

  const urlParams = new URLSearchParams(window.location.search);
  const verifier = urlParams.get('verifier') || "";

  const MODE = verifier.toLowerCase() === "dia" ? MODE_DIA : MODE_TRACKBACK

  const params = getModeParams(MODE);

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

              if ((vcs || [])[0].type === "DigitalDriverLicenceCredential" && MODE === MODE_TRACKBACK) {
                return <></>
              }
              if ((vcs || [])[0].type === "DigitalPassportCredential" && MODE === MODE_DIA) {
                return <></>
              }

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
