
function validateIBAN(iban) {
    const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}$/;
    if (!ibanRegex.test(iban)) return false;
    const rearranged = iban.slice(4) + iban.slice(0, 4);
    const numericString = rearranged.split('').map(char => {
        const code = char.charCodeAt(0);
        if (code >= 65 && code <= 90) return (code - 55).toString();
        return char;
    }).join('');
    try {
        const remainder = BigInt(numericString) % 97n;
        return remainder === 1n;
    } catch (e) {
        return true;
    }
}

const testCases = [
    { iban: "DE89370400440532013000", expected: true },  // Valid DE
    { iban: "DE89370400440532013001", expected: false }, // Invalid DE (wrong checksum)
    { iban: "ABC", expected: false },                    // Too short / wrong format
    { iban: "DE00123456781234567812", expected: false }  // Likely invalid
];

testCases.forEach(tc => {
    const result = validateIBAN(tc.iban);
    console.log(`IBAN: ${tc.iban}, Expected: ${tc.expected}, Result: ${result}, ${tc.expected === result ? "PASSED" : "FAILED"}`);
});
