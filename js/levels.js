export const LEVEL_DATA = {
  1: {
    id:1,name:'初识螺丝',boxQueue:[['gray','brown'],['green','blue'],['red',null]],
    plates:[
      {id:'p1',art:'back',shape:'rect',shapeParams:[3,3],position:[0,0,0],layer:0,screws:[
        {id:'s1',color:'green',localPos:[181,897]},{id:'s2',color:'green',localPos:[448,899]},
        {id:'s3',color:'red',localPos:[184,1168]},{id:'s4',color:'green',localPos:[446,1168]}]},
      {id:'p2',art:'pink',shape:'rect',shapeParams:[3,3],position:[0,0,0],layer:1,screws:[
        {id:'s5',color:'red',localPos:[440,988]},{id:'s6',color:'blue',localPos:[656,988]},{id:'s7',color:'red',localPos:[542,1136]}]},
      {id:'p3',art:'blue',shape:'rect',shapeParams:[3,3],position:[0,0,0],layer:2,screws:[
        {id:'s8',color:'blue',localPos:[524,1233]},{id:'s9',color:'brown',localPos:[795,1235]},
        {id:'s10',color:'brown',localPos:[662,1364]},{id:'s11',color:'brown',localPos:[530,1509]},{id:'s12',color:'blue',localPos:[785,1504]}]},
      {id:'p4',art:'heart',shape:'heart',shapeParams:[3,3],position:[0,0,0],layer:3,screws:[
        {id:'s13',color:'gray',localPos:[184,1366]},{id:'s14',color:'gray',localPos:[292,1362]},{id:'s15',color:'gray',localPos:[242,1444]}]},
    ],
    overlaps:[{upper:'p2',lower:'p1',blocksScrews:['s2','s4']}],
  },

  2: {
    id: 2,
    name: '步步为营',
    boxQueue: [['red', 'blue'], ['green', 'yellow'], ['red', 'blue'], ['green', 'yellow']],
    plates: [
      {
        id: 'pA', shape: 'pentagon', shapeParams: [1.5],
        position: [-1.0, 0, 0.5], rotation: 0, layer: 0,
        screws: [
          { id: 's1',  color: 'red',    localPos: [ 0.0,  0.7] },
          { id: 's2',  color: 'blue',   localPos: [-0.7,  0.1] },
          { id: 's3',  color: 'green',  localPos: [ 0.7,  0.1] },
          { id: 's4',  color: 'yellow', localPos: [-0.45,-0.6] },
          { id: 's5',  color: 'red',    localPos: [ 0.45,-0.6] },
          { id: 's6',  color: 'blue',   localPos: [ 0.0, -0.1] },
        ],
      },
      {
        id: 'pB', shape: 'rect', shapeParams: [2.0, 1.4],
        position: [1.3, 0, 0.3], rotation: 0, layer: 0,
        screws: [
          { id: 's7',  color: 'green',  localPos: [-0.5,  0.3] },
          { id: 's8',  color: 'yellow', localPos: [ 0.5,  0.3] },
          { id: 's9',  color: 'red',    localPos: [-0.5, -0.3] },
          { id: 's10', color: 'blue',   localPos: [ 0.5, -0.3] },
        ],
      },
      {
        id: 'pE', shape: 'triangle', shapeParams: [1.8],
        position: [0.0, 0, -1.0], rotation: 0, layer: 0,
        screws: [
          { id: 's11', color: 'green',  localPos: [ 0.0,  0.15] },
          { id: 's12', color: 'yellow', localPos: [-0.35,-0.2] },
        ],
      },
      {
        id: 'pC', shape: 'lshape', shapeParams: [2.4, 2.0],
        position: [-0.8, 0.25, 0.3], rotation: 0, layer: 1,
        screws: [
          { id: 's13', color: 'red',    localPos: [-0.8, 0.55] },
          { id: 's14', color: 'blue',   localPos: [0, 0.55] },
          { id: 's15', color: 'green',  localPos: [0.8, 0.55] },
          { id: 's16', color: 'yellow', localPos: [-0.8, -0.45] },
          { id: 's17', color: 'red',    localPos: [-0.15, -0.45] },
          { id: 's18', color: 'green',  localPos: [-0.15, 0.05] },
        ],
      },
      {
        id: 'pD', shape: 'rect', shapeParams: [2.2, 1.6],
        position: [1.0, 0.25, -0.3], rotation: -0.15, layer: 1,
        screws: [
          { id: 's19', color: 'blue',   localPos: [-0.65, 0.4] },
          { id: 's20', color: 'yellow', localPos: [0, 0.4] },
          { id: 's21', color: 'red',    localPos: [0.65, 0.4] },
          { id: 's22', color: 'blue',   localPos: [-0.65, -0.4] },
          { id: 's23', color: 'yellow', localPos: [0, -0.4] },
          { id: 's24', color: 'green',  localPos: [0.65, -0.4] },
        ],
      },
    ],
    overlaps: [
      { upper: 'pC', lower: 'pA', blocksScrews: ['s1', 's2', 's3'] },
      { upper: 'pC', lower: 'pB', blocksScrews: ['s7'] },
      { upper: 'pD', lower: 'pB', blocksScrews: ['s8', 's9'] },
      { upper: 'pD', lower: 'pE', blocksScrews: ['s11', 's12'] },
    ],
  },

  3: {
    id: 3,
    name: '全力以赴',
    boxQueue: [
      ['red', 'blue'], ['green', 'yellow'], ['purple', 'orange'],
      ['red', 'blue'], ['green', 'yellow'], ['purple', 'orange'],
    ],
    plates: [
      {
        id: 'pA', shape: 'hexagon', shapeParams: [1.6],
        position: [-1.2, 0, 0.8], rotation: 0, layer: 0,
        screws: [
          { id: 's1',  color: 'red',    localPos: [ 0.0,  0.8] },
          { id: 's2',  color: 'blue',   localPos: [-0.7,  0.3] },
          { id: 's3',  color: 'green',  localPos: [ 0.7,  0.3] },
          { id: 's4',  color: 'purple', localPos: [-0.7, -0.3] },
          { id: 's5',  color: 'orange', localPos: [ 0.7, -0.3] },
          { id: 's6',  color: 'yellow', localPos: [ 0.0, -0.8] },
        ],
      },
      {
        id: 'pB', shape: 'rect', shapeParams: [2.4, 1.8],
        position: [1.2, 0, 0.6], rotation: 0, layer: 0,
        screws: [
          { id: 's7',  color: 'green',  localPos: [-0.6,  0.45] },
          { id: 's8',  color: 'yellow', localPos: [ 0.6,  0.45] },
          { id: 's9',  color: 'red',    localPos: [-0.6, -0.45] },
          { id: 's10', color: 'purple', localPos: [ 0.6, -0.45] },
          { id: 's11', color: 'orange', localPos: [ 0.0,  0.0] },
          { id: 's12', color: 'blue',   localPos: [ 0.0,  0.45] },
        ],
      },
      {
        id: 'pC', shape: 'lshape', shapeParams: [2.6, 2.0],
        position: [-0.8, 0.25, 0.2], rotation: 0, layer: 1,
        screws: [
          { id: 's13', color: 'red',    localPos: [-0.8, 0.55] },
          { id: 's14', color: 'blue',   localPos: [0, 0.55] },
          { id: 's15', color: 'orange', localPos: [0.8, 0.55] },
          { id: 's16', color: 'yellow', localPos: [-0.8, -0.45] },
          { id: 's17', color: 'purple', localPos: [-0.15, -0.45] },
          { id: 's18', color: 'green',  localPos: [-0.15, 0.05] },
        ],
      },
      {
        id: 'pD', shape: 'pentagon', shapeParams: [1.4],
        position: [1.0, 0.25, -0.4], rotation: 0.2, layer: 1,
        screws: [
          { id: 's19', color: 'blue',   localPos: [ 0.0,  0.7] },
          { id: 's20', color: 'yellow', localPos: [-0.65, 0.1] },
          { id: 's21', color: 'red',    localPos: [ 0.65, 0.1] },
          { id: 's22', color: 'orange', localPos: [-0.4, -0.55] },
          { id: 's23', color: 'green',  localPos: [ 0.4, -0.55] },
          { id: 's24', color: 'purple', localPos: [ 0.0,  0.1] },
        ],
      },
      {
        id: 'pE', shape: 'rect', shapeParams: [2.0, 1.2],
        position: [0.0, 0.25, -1.2], rotation: 0, layer: 1,
        screws: [
          { id: 's25', color: 'red',    localPos: [-0.5,  0.25] },
          { id: 's26', color: 'orange', localPos: [ 0.5,  0.25] },
          { id: 's27', color: 'purple', localPos: [-0.5, -0.25] },
          { id: 's28', color: 'green',  localPos: [ 0.5, -0.25] },
        ],
      },
      {
        id: 'pF', shape: 'rect', shapeParams: [2.8, 1.4],
        position: [-0.5, 0.5, 0.5], rotation: 0.1, layer: 2,
        screws: [
          { id: 's29', color: 'blue',   localPos: [-0.8,  0.25] },
          { id: 's30', color: 'yellow', localPos: [ 0.8,  0.25] },
          { id: 's31', color: 'purple', localPos: [-0.8, -0.25] },
          { id: 's32', color: 'green',  localPos: [ 0.8, -0.25] },
        ],
      },
      {
        id: 'pG', shape: 'triangle', shapeParams: [2.2],
        position: [0.8, 0.5, -0.6], rotation: 0, layer: 2,
        screws: [
          { id: 's33', color: 'red',    localPos: [ 0.0,  0.3] },
          { id: 's34', color: 'orange', localPos: [-0.45,-0.15] },
          { id: 's35', color: 'yellow', localPos: [ 0.45,-0.15] },
          { id: 's36', color: 'blue',   localPos: [ 0.0, -0.15] },
        ],
      },
    ],
    overlaps: [
      { upper: 'pC', lower: 'pA', blocksScrews: ['s1', 's2', 's3'] },
      { upper: 'pC', lower: 'pB', blocksScrews: ['s7'] },
      { upper: 'pD', lower: 'pB', blocksScrews: ['s8', 's10'] },
      { upper: 'pE', lower: 'pB', blocksScrews: ['s9'] },
      { upper: 'pF', lower: 'pC', blocksScrews: ['s13', 's14', 's15'] },
      { upper: 'pF', lower: 'pD', blocksScrews: ['s19'] },
      { upper: 'pG', lower: 'pD', blocksScrews: ['s20', 's21'] },
      { upper: 'pG', lower: 'pE', blocksScrews: ['s25', 's26'] },
    ],
  },
};
