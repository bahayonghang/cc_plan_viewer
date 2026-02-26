import { render } from 'preact';
import { App } from './App';
import 'highlight.js/styles/github-dark-dimmed.css';
import './styles/main.css';

const root = document.getElementById('root');
if (root) {
  render(<App />, root);
}
