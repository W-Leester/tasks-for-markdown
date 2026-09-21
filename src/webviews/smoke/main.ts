import { mount } from 'svelte';
import '../shared/tokens.css';
import App from './App.svelte';

mount(App, { target: document.getElementById('app')! });
