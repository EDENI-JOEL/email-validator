const dns = require('dns');
const net = require('net');
const fs = require('fs');
const readline = require('readline');

// Create a readable stream from the file
const fileStream = fs.createReadStream('emails2.txt');
const filePath = 'output.txt';

// Create an interface for reading the file line by line
const rl = readline.createInterface({
  input: fileStream,
  output: process.stdout,
  terminal: false
});

const emails = [];

// Read the file line by line
rl.on('line', (line) => {
    (async () => {
        // const email = 'test@example.com';
        const result = await validateEmail(line);
        if(!result){
            fs.appendFileSync(filePath, `${line} \n`, 'utf8');
        }
        // console.log(`Is the email "${line}" valid and reachable?`, result);
    })();
//   emails.push(line);
});

rl.on('close', () => {
  console.log('File reading complete.');
  
//   console.log(emails)
});

/**
 * Validate the email format using regex
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmailFormat(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Check if the domain has valid MX records
 * @param {string} domain
 * @returns {Promise<boolean>}
 */
function hasMXRecords(domain) {
    return new Promise((resolve, reject) => {
        dns.resolveMx(domain, (err, addresses) => {
            if (err || !addresses || addresses.length === 0) {
                return resolve(false);
            }
            resolve(true);
        });
    });
}

/**
 * Check if the email is reachable using SMTP handshake
 * @param {string} email
 * @param {string} domain
 * @returns {Promise<boolean>}
 */
function checkSMTP(email, domain) {
    return new Promise((resolve) => {
        const socket = net.createConnection(25, domain);

        socket.setTimeout(5000);

        socket.on('connect', () => {
            socket.write(`EHLO ${domain}\r\n`);
            socket.write(`MAIL FROM:<test@example.com>\r\n`);
            socket.write(`RCPT TO:<${email}>\r\n`);
        });

        let isReachable = false;

        socket.on('data', (data) => {
            if (data.toString().includes('250')) {
                isReachable = true;
            }
            socket.end();
        });

        socket.on('error', () => {
            resolve(false);
        });

        socket.on('timeout', () => {
            socket.destroy();
            resolve(false);
        });

        socket.on('end', () => {
            resolve(isReachable);
        });
    });
}

/**
 * Main function to validate if an email address is active and reachable
 * @param {string} email
 * @returns {Promise<boolean>}
 */
async function validateEmail(email) {
    if (!isValidEmailFormat(email)) {
        console.log("Invalid email format");
        return false;
    }

    const domain = email.split('@')[1];

    const hasMX = await hasMXRecords(domain);
    if (!hasMX) {
        console.log("No MX records found");
        return false;
    }

    const isReachable = await checkSMTP(email, domain);
    return isReachable;
}

// Usage example
// (async () => {
//     const email = 'test@example.com';
//     const result = await validateEmail(email);
//     console.log(`Is the email "${email}" valid and reachable?`, result);
// })();