import { render } from 'preact';
import { App } from './App';
import './styles/main.css';

const root = document.getElementById('root');
if (root) {
  render(<App />, root);
}
