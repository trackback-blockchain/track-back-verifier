import { useEffect, useState } from 'react';
import moment from 'moment';
import { library } from '@fortawesome/fontawesome-svg-core'
import { fab } from '@fortawesome/free-brands-svg-icons'
import { faCheckSquare, faCoffee, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons'
import { blake2AsHex } from '@polkadot/util-crypto';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import './App.css';
library.add(fab, faCheckSquare, faCoffee, faCheck, faTimes)
var QRCode = require('qrcode.react');


async function getSharedVCPS() {
  const response = await fetch("http://localhost/api/v1/verifiable_credentials")
  return await response.json()
}

function camelCaseToLetter(text) {
  const result = text.replace(/([A-Z])/g, " $1");
  return result.charAt(0).toUpperCase() + result.slice(1);
}

const MODE_DIA = "trackback-dia.trackback.dev"
const MODE_TA = "trackback-ta.trackback.dev"
const MODE_TRACKBACK = "trackback-verifier.trackback.dev"


function getModeParams(mode) {
  if (mode === MODE_DIA) {
    return {
      title: "Trackback DIA™",
      url: "https://wallet.trackback.dev?r=https://trackback-dia.trackback.dev/api/v1/vcp/passportRequest"
    }
  } else if (mode === MODE_TA) {
    return {
      title: "Trackback Transport Authority™",
      url: "https://wallet.trackback.dev?r=https://trackback-ta.trackback.dev/api/v1/vcp/licenceRequest"
    }
  } else {
    return {
      title: "Trackback License Authority™",
      url: "https://wallet.trackback.dev?r=https://trackback-verifier.trackback.dev/api/v1/vcp/trackbackLicenceRequest"
    }
  }
} 

const ImageValidate = ({ image }) => {

  return <img src={image} alt="" width="100" height="100" />
}

function App() {

  const [data, setData] = useState([])

  const MODE = window.location.host;

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
            <tr className="vc-header">
              <th>Date</th>
              <th>Claim</th>
              <th>Verified</th>
            </tr>
            {(data.vcps || []).map(({ vcs, datetime, vcpVerified }, i) => {

              return <tr key={i}>
                <td className="datetime">
                  {moment((datetime)).format('MMMM Do YYYY, h:mm:ss a')}</td>
                <td>
                  <table className="styled-table2">

                    {(vcs || []).map((vc) => {
                      const { id, valid, type, ...other } = vc
                      const keys = Object.keys(other);

                      const name = keys[0] === "imageUri" ? "Photo" : keys[0];
                      const value = other[keys[0]]


                      return (
                        <tr key={name}>
                          <td className="credential-key">
                            {camelCaseToLetter(name)}
                          </td>
                          <td className="credential-value ">

                            {keys[0] === 'imageUri' ? <ImageValidate image={value} /> : value}
                          </td>
                        </tr>
                      )
                    })}
                  </table>
                </td>


                <td>{vcpVerified ? <FontAwesomeIcon icon="check" className="credential-verified" /> : <FontAwesomeIcon icon="times" className="credential-counterfeit" />}</td>

              </tr>
            })}
          </table>

        </div>

      </div>
    </div>
  );
}

export default App;
