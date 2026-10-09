import test from 'node:test';
import assert from 'node:assert/strict';
import { organizeSheet } from '../lib/source-data.ts';
import { colorHex, validColor } from '../lib/record-colors.ts';
import { loadRecordCorrections } from '../lib/record-corrections-store.ts';
test('pink source marks debt paid only in Ciudad de Dios; explicit confirmation survives elsewhere', () => {
  const cell = (value, style = null) => ({
    value,
    style,
    type: 's',
    formula: null,
  });
  const sheet = {
    name: 'AA DATOS',
    state: 'visible',
    merges: [],
    rows: [
      { row: 1, cells: { A1: cell('NOMBRES Y APELLIDOS') } },
      { row: 2, cells: { A2: cell('Persona', 'p') } },
    ],
  };
  const styles = { p: { fill: '#FF99CC' } };
  assert.equal(
    organizeSheet(sheet, 0, styles).records[1].situation.paidInFull,
    false,
  );
  assert.equal(organizeSheet(sheet, 0, styles).records[1].color, 'pink');
  assert.equal(
    organizeSheet({ ...sheet, name: 'CIUDAD DE DIOS' }, 0, styles).records[1]
      .situation.paidInFull,
    true,
  );
  assert.equal(
    organizeSheet({ ...sheet, name: 'SERVICIOS - CIUDAD DE DIOS' }, 0, styles)
      .records[1].situation.paidInFull,
    false,
  );
  const data = {
    sourceHash: 'hash',
    sheets: [sheet],
    corrections: {
      'hash:0:2': {
        location: 'B-24AA',
        observation: 'Confirmado',
        paidInFull: true,
        debtConfirmed: true,
        version: 1,
        color: 'yellow',
      },
    },
  };
  const r = organizeSheet(sheet, 0, styles, data).records[1];
  assert.equal(r.situation.paidInFull, true);
  assert.equal(r.color, 'yellow');
});
test('palette retains exact workbook legend tones and accepts no arbitrary CSS', () => {
  assert.equal(colorHex('green'), '#A9CE91');
  assert.equal(colorHex('yellow'), '#FFE699');
  assert.equal(colorHex('blue'), '#6699FF');
  assert.equal(colorHex('red'), '#FF0000');
  assert.equal(colorHex('cyan'), '#66FFFF');
  assert.equal(colorHex('lime'), '#CCFF66');
  assert.equal(validColor('url(evil)'), false);
});
test('black source formatting is not a row label, but a chosen black label is preserved', () => {
  const cell = (value, style=null) => ({value,style,type:'s',formula:null});
  const sheet={name:'AA DATOS',state:'visible',merges:[],rows:[{row:1,cells:{A1:cell('NOMBRES Y APELLIDOS')}},{row:2,cells:{A2:cell('Persona','default')}}]};
  const styles={default:{fill:'#000000',color:'#FFFFFF'}};
  assert.equal(organizeSheet(sheet,0,styles).records[1].color,'');
  const data={sourceHash:'hash',sheets:[sheet],corrections:{'hash:0:2':{location:'A-1',observation:'',version:1,color:'black',colorConfirmed:true}}};
  assert.equal(organizeSheet(sheet,0,styles,data).records[1].color,'black');
});
test('saved inherited black is cleared using audit evidence without losing deliberate choices', async () => {
  const stored={inherited:{color:'black',version:1},chosen:{color:'black',version:2},current:{color:'black',colorConfirmed:true,version:3}};
  const history=[{recordId:'inherited',before:{color:'black'},after:{color:'black'}},{recordId:'chosen',before:{color:'yellow'},after:{color:'black'}}];
  const DB={prepare:sql=>({all:async()=>({results:sql.includes('FROM settings')?Object.entries(stored).map(([id,c])=>({key:'record-correction:'+id,value:JSON.stringify(c)})):history.map(h=>({target:JSON.stringify(h)}))})})};
  const result=await loadRecordCorrections(DB);
  assert.equal(result.inherited.color,undefined);
  assert.equal(result.chosen.color,'black');
  assert.equal(result.current.color,'black');
  assert.equal(result.inherited.version,1);
});
test('legacy inferred flags are removed while explicit debt decisions remain', async () => {
  const stored = [
    ['inferred', { paidInFull: true, version: 1 }],
    ['explicit', { paidInFull: true, version: 1 }],
    ['current', { paidInFull: false, debtConfirmed: true, version: 2 }],
  ];
  const history = [
    {
      recordId: 'inferred',
      before: { paidInFull: true },
      after: { paidInFull: true },
    },
    { recordId: 'explicit', before: null, after: { paidInFull: true } },
  ];
  const DB = {
    prepare: (sql) => ({
      all: async () => ({
        results: sql.includes('FROM settings')
          ? stored.map(([id, c]) => ({
              key: 'record-correction:' + (typeof id === 'string' ? id : ''),
              value: JSON.stringify(c),
            }))
          : history.map((h) => ({ target: JSON.stringify(h) })),
      }),
    }),
  };
  const result = await loadRecordCorrections(DB);
  assert.equal(result.inferred.paidInFull, undefined);
  assert.equal(result.explicit.paidInFull, true);
  assert.equal(result.current.paidInFull, false);
});
