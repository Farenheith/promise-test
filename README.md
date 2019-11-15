# Teste de comportamento de promessas

A ideia é avaliar o impacto em tempo de execução que existe em transformar um processo síncrono em assíncrono, e verificar, com três diferentes abordagens, quais códigos se comportam como esperamos.

## Conceito de síncrono / assíncrono

É importante destacar que síncrono != sequencial, no nosso cenário. O motor do node é single threaded, ou seja, ele só consegue fazer uma coisa de cada vez. Em um código síncrono em node (isto é, sem geração de promises, de observables, sem async nos métodos, sem await) é impossível que outros códigos se intercalem entre suas linhas, diferente de uma linguagem multi-threaded.

Um código assíncrono, no entanto, permite que outros processamentos se encaixe entre as linhas *assíncronas* do código, que também podemos chamar de *pontos de intercalação*. Dois exemplos de código assíncrono:

```
await asyncFunc1();
syncFunc();
await asyncFunc2();
console.log('Finished');
```
e também:

```
asyncFunc1().then(() => {
  syncFunc();
  return asyncFunc2();
 }).then(() =>
  console.log('Finished'));
```

Os dois códigos acima são assíncronos e tem pontos de intercalação nas mesmas linhas:
* A linha 1 e 3 dos códigos geram promessas e permitem intercalação de outras promessas que eventualmente entrarem na fila de processamento.
* A linha 2 não é assíncrona, então é impossível ocorrer uma intercalação neste ponto.

No entanto, veja que, em ambos os exemplos, os códigos serão executados de maneira sequencial. Quando olhamos para uma linha de processamento, isto é, uma cadeia de promessas, na prática não faz muita diferença se elas são ou não são assíncronas. No entanto, não é porque elas são sequenciais que elas não são assíncronas, porque se outra linha de processamento estiver em execução, esta linha poderá, em ambos os exemplos, gerar promessas que se intercalarão com essas.

É bom destacar que **quanto mais promessas entrarem na fila de processamento, mais tempo o node levará para gerenciá-las**, pois a lista de promessas é longa e é preciso checar qual está e qual não está pronta para ser executada em sequência. O ideal é que nunca geremos uma lista enorme de promessas para não deixar mais lento esse gerenciamento, mas é importante que processos longos e onerosos, mesmo que sejam executados sem recursos externos, seja transformado em assíncrono, para que ele não trave o processamento da thread do node.

Outro ponto importante: em ambos os exemplos, apenas uma promessa é mantida por vez para execução, por que? Porque uma nova promessa é criada quando a que está em execução está por morrer. A forma que temos de, de fato, gerar várias promessas de uma vez e colocá-las juntas na fila de execução, é algo desse tipo:

```
await Promise.all([
  asyncFunc1(),
  syncFunc(),
  asyncFunc2(),
]);
console.log('Finished');
```

Esse código faz entrar, de uma vez, 3 promessas na fila de execução do node, ao contrário dos anteriores, que faz uma nova entrar só quando a anterior morre. Há situações onde o Promise.all pode trazer vantagens, outras que não, e uma abordagem semelhante servirá de base para um dos testes que faremos abaixo.

## Simulação de múltiplas requests

O código principal possui um promise.all com 3 elementos, para simular a situação onde 3 requests chegam juntas em um servidor e são processadas em paralelo.

Temos duas variáveis para ajudar a calibrar o teste
* total: para definir quantas voltas o laço de cada requisição fará
* times: para definir quantos testes serão executados afim de se calcular uma média do resultado

As requets simuladas são as chamadas:
consoleInfo('POA')
consoleInfo('GRU')
consoleInfo('SSA')

Cada chamada irá avaliar se, a cada volta do laço, o código da iata era o esperado de acordo com a abordagem tomada. As falhas são contadas e impressas ao final do processo. É considerada uma falha quando a iata recebida não for a iata esperada do momento.

## Situação 1: index-no-await

Na primeira situação, o teste é feito sem o uso de awaits dentro do código. O esperado aqui, é:
* Que seja o mais rápido possível
* Que, primeiro, todas as execuções de POA sejam feitas, depois, de GRU, depois de SSA

## Situação 2: index-await

Na segunda situação, o teste é feito usando um await para avaliar a iata do momento. O esperado aqui, é:
* Que o teste seja um pouco mais lento que o primeiro
* Que as execuções sejam feitas intercaldas, POA, GRU, SSA, **exatamente** nesta ordem

## Situação 3: index-promise-all

Na terceira situação, o teste é feito inserindo todas as promesas do laço em um array e executando um Promise.all no final. O esperado aqui, é:
* Que o teste seja o mais lento de todos, já que estamos exigindo que o node gerencie mais travas de controle e um grande número de promessas ao mesmo tempo
* Que as execuções sejam feitas intercaldas, POA, GRU, SSA, **exatamente** nesta ordem

## Resultados

Tanto o primeiro como o segundo teste, mostraram o comportamento esperado, mas o terceiro não atendeu a segunda condição: os processos foram feitos sem nenhuma intercalação.

A intercalação na ordem exata era esperada porque:

* O node, internamente, gerencia a fila de promessas prontas para ser executadas, o que entrar primeiro na fila, é executado primeiro. No caso, a ordem de chamada das funções de teste eram POA, GRU, SSA, então as promessas foram criadas nessa ordem, o que fez elas entrarem, nessa ordem, na fila de promessas.

O motivo para a intercalação não ter sido feita no terceiro caso pode ser explicada da seguinte forma:
* As três promessas que entraram na fila de execução, primeiramente, foram as três chamadas para consoleInfo;
* A primeira a ser executada foi POA. Ela criou todas as promessas que ela esperava (colocando-as na fila do node), e depois chamou await Promise.all, o que deu oportunidade para executar a próxima promessa na fila: *consoleInfo('GRU')*;
* A próxima chamada criou todas as promessas esperadas para GRU, colocando-as na fila, depois chamando await Promise.all, dando oportunidade para a próxima promessa da fila ser executada: *consoleInfo('SSA')*;
* Foram executadas as próximas promessas da fila: todas geradas por *consoleInfo('POA')*, pois elas foram postas em ordem;
* Foram executadas as próximas promessas da fila: todas geradas por *consoleInfo('GRU')*, pois elas foram postas em ordem;
* Foram executadas as próximas promessas da fila: todas geradas por *consoleInfo('SSA')*, pois elas foram postas em ordem;

## Conclusão

* O Promise.all não é ideal para ser usado com um grande número de promessas, porque isso acaba colocando todas em sequencia na fila do node, tirando a oportunidade que requests concorrentes consigam intercalar suas promessas, que entrarão na fila depois. O ideal, é que Promise.all seja executado com um número limitado de promessas, para não causar ese efeito negativo;
* Caso essas promessas acessassem recursos externos ou gerassem várias oportunidades de intercalação (outras chamadas de await ou .then), poderiam ser geradas oportunidades para outros processos intercalarem suas promessas mas, mesmo assim, o grande volume de promessas geradas pela mesma linha de promessamento em sequencia, sem nenhum await entre elas, acaba diminuindo drasticamente intercalações de linhas de processamento diferente;
* O peso de gerenciamento das promessas acaba sendo maior para o node, o que tornará o processo mais lento, apesar de ser uma diferença ínfima;
* Para promessas que não dependem de recursos externos, usar o Promise.all não vai fazer elas serem executadas em paralelo porque, como todas são resolvidas na própria thread do node, tudo acabará sendo feito em alguma sequência arbitrária que o motor do node definirá. Paralelismo com promessas do node só podem acontecer, de fato, quando são feitas promessas que são resolvidas por processamentos externos.
