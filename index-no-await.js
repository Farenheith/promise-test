const total = 20000;
const tries = 100;

const expectedSequence = ['POA', 'GRU', 'SSA']
let lastIndex = expectedSequence.length - 1;
let lastPrefix = expectedSequence[lastIndex];
let numberOfFailures = 0;

// 378.6 ms sem await
// 417.5 ms com await
async function consoleInfo(prefix) {
    lastIndex = (lastIndex + 1) % expectedSequence.length;
    lastPrefix = expectedSequence[lastIndex];
    for (let i = 1; i < total; i++) {
        // console.log(`Expected ${lastPrefix} received ${prefix}`);
        if (lastPrefix !== prefix) {
            numberOfFailures++;
        }
    }
    console.log(`Number of failures: ${numberOfFailures} of ${total}`);
}

(async () => {
    const total = []
    for (i = 0; i < tries; i++) {
        const init = Date.now();
        await Promise.all([
            consoleInfo('POA'),
            consoleInfo('GRU'),
            consoleInfo('SSA'),
        ]);
        total.push(Date.now() - init);
    }

    let media = 0;
    total.forEach(x => media += x);
    console.log(`*********** TERMINOU O PROCESSAMENTO EM MÉDIA em ${media / tries} ms`);
})();