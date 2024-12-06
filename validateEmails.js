const dns = require('dns');
const fs = require('fs');
const readline = require('readline');

// Create a readable stream from the file
const fileStream = fs.createReadStream('emails.txt');
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
  emails.push(line.trim());
});

rl.on('close', async () => {
  console.log('File reading complete.');
  await validateEmails(emails);
  console.log(emails);
});

/**
 * Function to check if an email is reachable by verifying its MX records.
 * @param {string} email - The email address to validate.
 * @returns {Promise<boolean>} - Returns a promise that resolves to true if reachable, otherwise false.
 */
function isEmailReachable(email) {
    return new Promise((resolve, reject) => {
        const domain = email.split('@')[1];

        if (!domain) {
            reject('Invalid email format');
            return;
        }

        dns.resolveMx(domain, (err, addresses) => {
            if (err) {
                resolve(false); // No MX records, domain likely not reachable
                return;
            }

            resolve(addresses && addresses.length > 0); // True if MX records found
        });
    });
}

/**
 * Function to validate an array of emails for reachability.
 * @param {string[]} emails - Array of email addresses to validate.
 */
async function validateEmails(emails) {
    const invalidEmails = [];

    for (const email of emails) {
        try {
            const isReachable = await isEmailReachable(email);
            if (!isReachable) {
                invalidEmails.push(email);
            }
        } catch (error) {
            console.error(`Error validating email ${email}:`, error);
        }
    }

    // Write all invalid emails to output.txt at once
    if (invalidEmails.length > 0) {
        fs.writeFileSync(filePath, invalidEmails.join('\n') + '\n', 'utf8');
    }
    console.log('Invalid emails have been saved to output.txt');
}
