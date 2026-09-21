import { mount } from 'svelte';
import '../shared/tokens.css';
import EditApp from './EditApp.svelte';

mount(EditApp, { target: document.getElementById('app')! });
