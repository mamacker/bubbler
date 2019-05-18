const raspi = require('raspi');
const gpio = require('raspi-gpio');
const pwm = require('raspi-pwm');
const https = require('https');
const FauxMo = require('fauxmojs');
const os = require('os');
const dns = require('dns');

let ipAddress = '';
dns.lookup(os.hostname()+".local", (e,a,f) => { console.log("IP address: ", a, "Errors: ", e); ipAddress = a; });

var pumpVal = 0;
var direction = 0.1;
var ledVal = 0;
const led = new pwm.PWM('P1-12');
const pump = new pwm.PWM('P1-35');
const solenoidPin = new gpio.DigitalOutput('P1-36');

function isFloatBelow1(n){
  return (Number(n) === n && n % 1 !== 0 && n < 1 && n > 0) || n == 1 || n == 0;
}

function setPump(value) {
  if (value <= .05) {
    solenoidPin.write(0);
    pump.write(0);
  } else {
    pump.write(value);
    solenoidPin.write(1);
  }
}

function setLight(value) {
  led.write(value);
}

function checkSite() {
  https.get('https://theamackers.com/bubbler/all', (res) => {
    var data = '';
    res.on('data', (piece) => {
      data += piece;
    });

    res.on('end', () => {
      var result = JSON.parse(data);
      if (result.led && isFloatBelow1(Number(result.led))) {
        setLight(Number(result.led));
      }
      if (result.pump && isFloatBelow1(Number(result.pump))) {
        setPump(Number(result.pump));
      }
    });
  })
}

raspi.init(() => {
  led.write(0);
  pump.write(0);
  solenoidPin.write(0);
  setInterval(checkSite, 3000);  

  console.log("Registering Faux Alexa outlet...");
  let fauxMo = new FauxMo({
    ipAddress: ipAddress,
    devices: [{
        name: 'bubbler',
        port: 11000,
        handler: (action) => {
          console.log('bubbler:', action);
          isEnabled = (action == "on");
          if (isEnabled) {
            https.get('https://theamackers.com/bubbler/set?which=pump&level=1', (res) => {});
            setTimeout(() => {
              https.get('https://theamackers.com/bubbler/set?which=led&level=1', (res) => {});
            }, 100);
          } else {
            https.get('https://theamackers.com/bubbler/set?which=pump&level=0', (res) => {});
            setTimeout(() => {
              https.get('https://theamackers.com/bubbler/set?which=led&level=0', (res) => {});
            }, 100);
          }
        }
      }
    ]
  });
});
