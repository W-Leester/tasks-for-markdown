import { mount } from 'svelte';
import '../shared/tokens.css';
import QueryResultsApp from './QueryResultsApp.svelte';

mount(QueryResultsApp, { target: document.getElementById('app')! });
