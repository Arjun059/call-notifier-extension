import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  'body': {
    'fontFamily': 'Arial, sans-serif',
    'width': [{ 'unit': 'px', 'value': 300 }],
    'padding': [{ 'unit': 'px', 'value': 10 }, { 'unit': 'px', 'value': 10 }, { 'unit': 'px', 'value': 10 }, { 'unit': 'px', 'value': 10 }]
  },
  'h2': {
    'fontSize': [{ 'unit': 'px', 'value': 16 }]
  },
  'card': {
    'border': [{ 'unit': 'px', 'value': 1 }, { 'unit': 'string', 'value': 'solid' }, { 'unit': 'string', 'value': '#ddd' }],
    'padding': [{ 'unit': 'px', 'value': 8 }, { 'unit': 'px', 'value': 8 }, { 'unit': 'px', 'value': 8 }, { 'unit': 'px', 'value': 8 }],
    'marginBottom': [{ 'unit': 'px', 'value': 8 }],
    'borderRadius': '6px',
    'background': '#f9f9f9'
  },
  'time': {
    'fontSize': [{ 'unit': 'px', 'value': 11 }],
    'color': 'gray'
  },
  '#actions': {
    'display': 'flex',
    'gap': '15px'
  },
  'call-row': {
    'marginBottom': [{ 'unit': 'px', 'value': 10 }],
    'backgroundColor': 'red'
  }
});
