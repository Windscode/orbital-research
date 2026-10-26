import resources from '../research/library.json';
import lessons from '../research/learning.json';
import vehicles from '../research/vehicles.json';
import briefings from '../research/briefings.json';
import graph from '../research/knowledge-graph.json';
import workflows from '../research/workflows.json';
import dossierResearch from '../research/research-dossiers-v10.json';
import type {ResearchCatalog} from './catalog';
export const catalog={resources,lessons,vehicles,briefings:briefings.slice().sort((a,b)=>b.date.localeCompare(a.date)),graph,workflows,dossiers:dossierResearch.dossiers} as ResearchCatalog;
