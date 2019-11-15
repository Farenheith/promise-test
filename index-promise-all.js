const total = 20000;
const tries = 100;

const expectedSequence = ['POA', 'GRU', 'SSA']
let lastIndex = expectedSequence.length - 1;
let lastPrefix = expectedSequence[lastIndex];
let numberOfFailures = 0;
async function consoleInfo(prefix) {
    const promises = [];
    for (let i = 1; i < total; i++) {
        promises.push((async () => {
            lastIndex = (lastIndex + 1) % expectedSequence.length;
            lastPrefix = expectedSequence[lastIndex];
            await (async () => {
                //console.log(`Expected ${lastPrefix} received ${prefix}`);
                if (lastPrefix !== prefix) {
                    numberOfFailures++;
                }
            })();
        })());
    }
    await Promise.all(promises);
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