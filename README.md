# Teste de compotamento de promessas

A ideia é avaliar o impacto em tempo de execução que existe em transformar um processo síncrono em assíncrono, e verificar, con três diferentes abordagens, quais códigos se comportam como esperamos

## Simulação de múltiplas requests

O código principal possui um promise.all com 3 elementos, para simular a situação onde 3 requests chegam juntas em um servidor e são processadas em paralelo.

Temos duas variáveis para ajudar a calibrar o teste
* total: para definir quantas voltas o laço de cada requisição fará
* times: para definir quantos testes serão executados afim de se calcular uma média do resultado

As requets simuladas são as chamadas:
consoleInfo('POA')
consoleInfo('GRU')
consoleInfo('SSA')

Cada chamada irá avaliar se, a cada volta do laço, o código da iata era o esperado de acordo com a abordagem tomada. As falhas são contadas e impressas ao final do processo. É considerada uma falha quando a iata do momento não for a mesma iata esperada para aquele teste

## Situação 1: index-no-await

Na primeira situação, o teste é feito sem o uso de awaits dentro do código. O esperado aqui, é:
* Que seja o mais rápido possível
* Que, primeiro, todas as execuções de POA sejam feitas, depois, de GRU, depois de SSA

## Situação 2: index-await

Na segunda situação, o teste é feito usando um await para avaliar se a iata do momento. O esperado aqui, é:
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
* Caso essas promessas acessassem recursos externos ou gerassem várias oportunidades de intercalação (outras chamadas de await ou .then), poderiam ser geradas oportunidades para outros processos intercalarem suas promessas mas, mesmo assim, o grande volume de promessas geradas pela mesma linha de promessamento em sequencia, sem nenhum await entre elas, acaba sendo diminuindo drasticamente essas oportunidades.
* O peso de gerenciamento das promessas acaba sendo maior para o node, o que tornará o processo mais lento, apesar de ser uma diferença ínfima 