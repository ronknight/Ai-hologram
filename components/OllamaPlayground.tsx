import React, { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import * as ollama from '../services/ollama';
import { SpinnerIcon } from './icons/SpinnerIcon';

type Strategy = 'json' | 'text' | 'rich' | 'grounded';

const PlaygroundSection: React.FC<{ title: string; description: string; children: React.ReactNode }> = ({ title, description, children }) => (
    <div className="bg-secondary/40 border border-gray-700/50 rounded-lg p-6 backdrop-blur-sm">
        <h3 className="text-xl font-bold text-cyan mb-2 drop-shadow-[0_0_5px_theme(colors.cyan)]">{title}</h3>
        <p className="text-gray-400 mb-4 text-sm">{description}</p>
        <div className="space-y-4">{children}</div>
    </div>
);

const LabeledInput: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div>
        <label className="block text-sm font-medium mb-1 text-gray-300">{label}</label>
        {children}
    </div>
);

const CommonInputStyles = "w-full px-3 py-2 bg-primary/70 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan focus:border-cyan transition-colors text-gray-200 placeholder-gray-500";
const CommonButtonStyles = "px-5 py-2 bg-accent/80 hover:bg-cyan text-white rounded-md transition-colors flex items-center justify-center disabled:bg-gray-600 disabled:cursor-not-allowed w-40";

const OllamaPlayground: React.FC = () => {
    const { ollamaUrl, selectedModel, temperature, connectionError } = useSettings();

    // State for JSON Generator
    const [jsonPrompt, setJsonPrompt] = useState('Describe a UI button component');
    const [jsonSchema, setJsonSchema] = useState('A JSON object with keys: "name" (string), "category" (one of: "Input", "Display", "Action"), and "summary" (a one-line string description).');
    const [jsonResult, setJsonResult] = useState('');
    const [jsonLoading, setJsonLoading] = useState(false);
    const [jsonError, setJsonError] = useState('');

    // State for Constrained Text
    const [constrainedText, setConstrainedText] = useState('Ollama is a powerful tool that allows you to run open-source large language models, such as Llama 3, locally. It bundles model weights, configuration, and data into a single package, managed by a Modelfile.');
    const [constrainedTask, setConstrainedTask] = useState('Summarize this into a concise, one-line description.');
    const [constrainedResult, setConstrainedResult] = useState('');
    const [constrainedLoading, setConstrainedLoading] = useState(false);
    const [constrainedError, setConstrainedError] = useState('');
    
    // State for Rich Content
    const [richPrompt, setRichPrompt] = useState('Explain the benefits of local AI models.');
    const [richPersona, setRichPersona] = useState('an expert in AI privacy and security');
    const [richResult, setRichResult] = useState('');
    const [richLoading, setRichLoading] = useState(false);
    const [richError, setRichError] = useState('');

    // State for Grounded Q&A
    const [groundedContext, setGroundedContext] = useState('Inventory:\n- Item A (Qty: 5, Color: Blue)\n- Item B (Qty: 2, Color: Red)\n- Item C (Qty: 10, Color: Blue)');
    const [groundedQuestion, setGroundedQuestion] = useState('How many blue items are in the inventory?');
    const [groundedResult, setGroundedResult] = useState('');
    const [groundedLoading, setGroundedLoading] = useState(false);
    const [groundedError, setGroundedError] = useState('');

    const handleGenerate = async (strategy: Strategy) => {
        if (!selectedModel || !ollamaUrl) return;
        const options = { baseUrl: ollamaUrl, model: selectedModel, temperature };

        switch (strategy) {
            case 'json':
                setJsonLoading(true);
                setJsonError('');
                setJsonResult('');
                try {
                    const result = await ollama.generateJson(options, jsonPrompt, jsonSchema);
                    setJsonResult(JSON.stringify(result, null, 2));
                } catch (e: any) { setJsonError(e.message); }
                setJsonLoading(false);
                break;
            case 'text':
                setConstrainedLoading(true);
                setConstrainedError('');
                setConstrainedResult('');
                try {
                    const result = await ollama.generateConstrainedText(options, constrainedText, constrainedTask);
                    setConstrainedResult(result);
                } catch (e: any) { setConstrainedError(e.message); }
                setConstrainedLoading(false);
                break;
            case 'rich':
                setRichLoading(true);
                setRichError('');
                setRichResult('');
                try {
                    const result = await ollama.generateRichContent(options, richPrompt, richPersona, 'Markdown');
                    setRichResult(result);
                } catch (e: any) { setRichError(e.message); }
                setRichLoading(false);
                break;
            case 'grounded':
                setGroundedLoading(true);
                setGroundedError('');
                setGroundedResult('');
                try {
                    const result = await ollama.generateGroundedResponse(options, groundedContext, groundedQuestion);
                    setGroundedResult(result);
                } catch (e: any) { setGroundedError(e.message); }
                setGroundedLoading(false);
                break;
        }
    };
    
    if (connectionError || !selectedModel) {
        return (
            <div className="w-full max-w-4xl mx-auto p-4 text-center">
                <p className="text-red-500 font-mono tracking-widest text-lg">
                    Connection error or no model selected. Please check your settings.
                </p>
            </div>
        )
    }

    return (
        <div className="w-full max-w-4xl mx-auto p-4 space-y-8 pb-16">
            <h1 className="text-4xl font-bold text-center text-gray-200">Ollama Service Playground</h1>
            
            {/* JSON Generation */}
            <PlaygroundSection title="Structured JSON Output" description="Force the model to return a clean, syntactically correct JSON object by providing an explicit prompt and schema.">
                <LabeledInput label="User Prompt">
                    <textarea rows={2} value={jsonPrompt} onChange={e => setJsonPrompt(e.target.value)} className={CommonInputStyles} />
                </LabeledInput>
                <LabeledInput label="Schema Description">
                     <textarea rows={3} value={jsonSchema} onChange={e => setJsonSchema(e.target.value)} className={CommonInputStyles} />
                </LabeledInput>
                <button onClick={() => handleGenerate('json')} disabled={jsonLoading} className={CommonButtonStyles}>
                    {jsonLoading ? <SpinnerIcon /> : "Generate JSON"}
                </button>
                {jsonError && <pre className="text-red-400 text-xs whitespace-pre-wrap">{jsonError}</pre>}
                {jsonResult && <pre className="bg-primary/50 p-3 rounded-md text-cyan/90 text-sm whitespace-pre-wrap">{jsonResult}</pre>}
            </PlaygroundSection>

            {/* Constrained Text */}
            <PlaygroundSection title="Constrained Text" description="Generate a short, specific text output by giving the model a single, restrictive job.">
                <LabeledInput label="Text to Process">
                    <textarea rows={4} value={constrainedText} onChange={e => setConstrainedText(e.target.value)} className={CommonInputStyles} />
                </LabeledInput>
                <LabeledInput label="Task for the Model">
                    <input type="text" value={constrainedTask} onChange={e => setConstrainedTask(e.target.value)} className={CommonInputStyles} />
                </LabeledInput>
                <button onClick={() => handleGenerate('text')} disabled={constrainedLoading} className={CommonButtonStyles}>
                    {constrainedLoading ? <SpinnerIcon /> : "Generate Text"}
                </button>
                {constrainedError && <pre className="text-red-400 text-xs whitespace-pre-wrap">{constrainedError}</pre>}
                {constrainedResult && <pre className="bg-primary/50 p-3 rounded-md text-gray-300 text-sm whitespace-pre-wrap">{constrainedResult}</pre>}
            </PlaygroundSection>

            {/* Rich Content */}
             <PlaygroundSection title="Rich Content (Markdown)" description="Generate formatted text by setting a persona and structure for the model to follow.">
                <LabeledInput label="Prompt">
                    <input type="text" value={richPrompt} onChange={e => setRichPrompt(e.target.value)} className={CommonInputStyles} />
                </LabeledInput>
                <LabeledInput label="Persona">
                    <input type="text" value={richPersona} onChange={e => setRichPersona(e.target.value)} className={CommonInputStyles} />
                </LabeledInput>
                <button onClick={() => handleGenerate('rich')} disabled={richLoading} className={CommonButtonStyles}>
                    {richLoading ? <SpinnerIcon /> : "Generate Report"}
                </button>
                {richError && <pre className="text-red-400 text-xs whitespace-pre-wrap">{richError}</pre>}
                {richResult && <pre className="bg-primary/50 p-3 rounded-md text-gray-300 text-sm whitespace-pre-wrap">{richResult}</pre>}
            </PlaygroundSection>

            {/* Grounded Q&A */}
             <PlaygroundSection title="Grounded Q&A" description="Force the model to answer a question based ONLY on the context you provide, preventing it from using its general knowledge.">
                <LabeledInput label="Context Data">
                    <textarea rows={4} value={groundedContext} onChange={e => setGroundedContext(e.target.value)} className={CommonInputStyles} />
                </LabeledInput>
                <LabeledInput label="Question">
                    <input type="text" value={groundedQuestion} onChange={e => setGroundedQuestion(e.target.value)} className={CommonInputStyles} />
                </LabeledInput>
                <button onClick={() => handleGenerate('grounded')} disabled={groundedLoading} className={CommonButtonStyles}>
                    {groundedLoading ? <SpinnerIcon /> : "Get Answer"}
                </button>
                {groundedError && <pre className="text-red-400 text-xs whitespace-pre-wrap">{groundedError}</pre>}
                {groundedResult && <pre className="bg-primary/50 p-3 rounded-md text-gray-300 text-sm whitespace-pre-wrap">{groundedResult}</pre>}
            </PlaygroundSection>
        </div>
    );
};

export default OllamaPlayground;
