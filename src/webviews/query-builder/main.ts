import { mount } from 'svelte';
import '../shared/tokens.css';
import QueryBuilderApp from './QueryBuilderApp.svelte';

mount(QueryBuilderApp, { target: document.getElementById('app')! });
