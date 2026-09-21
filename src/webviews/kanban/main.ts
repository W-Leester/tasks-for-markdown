import { mount } from 'svelte';
import '../shared/tokens.css';
import KanbanApp from './KanbanApp.svelte';

mount(KanbanApp, { target: document.getElementById('app')! });
