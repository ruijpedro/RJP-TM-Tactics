import { OUT_SKILLS,GK_SKILLS } from './analysis.js';
const names=[
 ['Tiago Serra','GK',29,79],['Diogo Sequeira','GK',22,67],['Miguel Valente','D C',27,80],['André Campos','D C',31,77],['Rui Nogueira','D C',23,74],['Pedro Abreu','D R',25,76],['Tomás Faria','D L',26,76],['Nuno Paiva','DM C',28,80],['Luís Rocha','DM C',22,73],['Ricardo Silva','M C',25,81],['Vasco Monteiro','M C',30,79],['Gonçalo Castro','M C',21,73],['Fábio Duarte','M L',24,77],['João Freire','M R',26,76],['Daniel Mota','OM C',27,82],['Martim Correia','OM L',23,83],['Hugo Barros','OM R',24,81],['Bruno Teles','F',26,85],['Alexandre Maia','F',30,79],['Henrique Reis','F',21,72],['Artur Lopes','D L, DM L',28,70],['Samuel Costa','D R, DM R',22,71],['David Pires','OM C, M C',24,75]
];
const strengths={
 GK:['han','ref','one','ari','jum'],DC:['mar','tac','pos','str','hea'],DL:['mar','tac','pac','cro'],DR:['mar','tac','pac','cro'],
 DMC:['tac','pas','pos','wor'],DML:['cro','pac','tac','wor'],DMR:['cro','pac','tac','wor'],MC:['pas','tec','wor','pos'],ML:['pac','cro','tec'],MR:['pac','cro','tec'],OMC:['pas','tec','fin','lon'],OML:['pac','cro','fin','tec'],OMR:['pac','cro','fin','tec'],F:['fin','hea','tec','lon']
};
function primary(fp){const [r,s='C']=fp.split(',')[0].trim().split(' ');if(r==='GK'||r==='F')return r;return r+s;}
export const demoPlayers=names.map(([name,fp,age,power],i)=>{
 const pos=primary(fp),keys=pos==='GK'?GK_SKILLS:OUT_SKILLS;
 const p={id:'demo-'+(i+1),name,fp,age,rec:3.5+(i%4)*.5,asi:9000+i*700,routine:7+(i*5%28),condition:92-(i%6)*4,inj:'',ban:'',excluded:false};
 for(const [j,k] of keys.entries()){
  const isKey=(strengths[pos]||[]).includes(k);
  p[k]=Math.min(20,Math.max(3,Math.round((power/100*12)+(isKey?4:0)+((i*7+j*11)%5)-2)));
 }
 return p;
});
