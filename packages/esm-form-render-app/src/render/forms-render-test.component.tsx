import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Dropdown, Form, Tabs, Tab, TabList, TabPanels, TabPanel, TextInput } from '@carbon/react';
import styles from './form-render.scss';
import { Run, Maximize, UserData } from '@carbon/react/icons';
import AceEditor from 'react-ace';
import 'ace-builds/webpack-resolver';
import { applyFormIntent, loadSubforms, FormEngine, FormSchema } from '@openmrs/openmrs-form-engine-lib';
import { useTranslation } from 'react-i18next';
import { ConfigObject, useConfig, openmrsFetch } from '@openmrs/esm-framework';
import { handleFormValidation } from '../form-validator';

function FormRenderTest() {
  const { t } = useTranslation();
  const headerTitle = t('formRenderTestTitle', 'Form Render Test');
  const { patientUuid, dataTypeToRenderingMap } = useConfig() as ConfigObject;
  const [formInput, setFormInput] = useState<FormSchema>();
  const [formIntents, setFormIntents] = useState([]);
  const [isIntentsDropdownDisabled, setIsIntentsDropdownDisabled] = useState(true);
  const [selectedFormIntent, setSelectedFormIntent] = useState('');
  const [inputErrorMessage, setInputErrorMessage] = useState<any>('');
  const [outputErrorMessage, setOutputErrorMessage] = useState<any>('');
  const [isSchemaLoaded, setIsSchemaLoaded] = useState(false);
  const [schemaOutput, setSchemaOutput] = useState('');
  const [encounterUuid, setEncounterUuid] = useState('');
  const [schemaInput, setSchemaInput] = useState(null);
  const [editorTheme, setEditorTheme] = useState('github');
  const jsonUrl = useMemo(() => new URLSearchParams(window.location.search).get('json'), []);
  const [key, setKey] = useState(0);
  const [defaultJson, setDefaultJson] = useState(localStorage.getItem('forms-render-test:draft-form'));
  // This is required because of the enforced CORS policy
  const corsProxy = 'ohri-form-render.globalhealthapp.net';

  const availableEditorThemes = [
    'monokai',
    'github',
    'tomorrow',
    'kuroir',
    'twilight',
    'xcode',
    'solarized_dark',
    'solarized_light',
    'terminal',
  ];

  const loadIntentsFromSchema = (jsonSchema) => {
    let _formIntents = jsonSchema.availableIntents || [];

    if (_formIntents.length) {
      setFormIntents(_formIntents);
      setIsIntentsDropdownDisabled(false);
      setSelectedFormIntent('');
    } else {
      setFormIntents([]);
      setIsIntentsDropdownDisabled(true);
      setSelectedFormIntent('*');
    }
  };

  const updateFormIntentInput = (e) => {
    setSelectedFormIntent(e.selectedItem.intent);
    setIsSchemaLoaded(false);
  };

  const updateFormJsonInput = (json) => {
    setInputErrorMessage('');
    try {
      const parsedSchema = typeof json == 'string' ? JSON.parse(json) : json;
      setSchemaInput(parsedSchema);
      setFormInput(parsedSchema);
      loadIntentsFromSchema(parsedSchema);
      localStorage.setItem('forms-render-test:draft-form', typeof json == 'string' ? json : JSON.stringify(json));
    } catch (err) {
      setInputErrorMessage(err.toString());
    }
    setIsSchemaLoaded(false);
  };

  const formValidation = () => {
    handleFormValidation(schemaInput, dataTypeToRenderingMap);
  };

  const handleFormSubmission = (e) => {
    setIsSchemaLoaded(false);
    setOutputErrorMessage('');
    const filteredSchema = applyFormIntent(selectedFormIntent, loadSubforms(schemaInput));

    try {
      setSchemaOutput(JSON.stringify(filteredSchema, null, '  '));
      setFormInput(filteredSchema);
    } catch (err) {
      setOutputErrorMessage(err.toString());
    }

    setIsSchemaLoaded(true);
  };

  const [windowSizeMode, setWindowSizeMode] = useState('minimized');

  const toggleViewMode = useCallback(() => {
    if (windowSizeMode === 'minimized') {
      setWindowSizeMode('maximized');
    } else {
      setWindowSizeMode('minimized');
    }
  }, [windowSizeMode]);

  useEffect(() => {
    if (defaultJson && isIntentsDropdownDisabled) {
      try {
        const jsonObject = typeof defaultJson === 'string' ? JSON.parse(defaultJson) : defaultJson;
        loadIntentsFromSchema(jsonObject);
        setSchemaInput(jsonObject);
      } catch (err) {}
    }
  }, [defaultJson]);

  useEffect(() => {
    if (jsonUrl) {
      const dropboxURLSuffix = '?dl=1';
      let url = jsonUrl.split('?')[0] + dropboxURLSuffix;
      url = url.replace('www.dropbox.com', corsProxy);
      fetch(url)
        .then((response) => response.json())
        .then((data) => {
          if (data) {
            setDefaultJson(JSON.stringify(data, null, 2));
            updateFormJsonInput(data);
            setKey(key + 1);
          }
        })
        .catch((err) => {
          console.error(err);
        });
    }
  }, [jsonUrl]);

  return (
    <div className={styles.container}>
      <div className={styles.mainWrapper}>
        <div className={styles.formRenderTitle}>{headerTitle}</div>
        <div id="container" style={{ display: 'flex' }}>
          <div style={{ width: '50%', display: windowSizeMode == 'maximized' ? 'none' : 'block' }}>
            <h4>{t('jsonSchemaHeader', 'JSON Schema')}</h4>
            <h5 style={{ color: 'orange', marginBottom: '1rem' }}>{inputErrorMessage}</h5>
            <Tabs>
              <TabList contained>
                <Tab>{t('jsonInput', 'JSON Input')}</Tab>
                <Tab>{t('finalSchema', 'Final Schema')}</Tab>
              </TabList>
              <TabPanels>
                <TabPanel>
                  <Form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleFormSubmission(e);
                    }}
                  >
                    <AceEditor
                      key={key}
                      mode="json"
                      theme={editorTheme}
                      onChange={updateFormJsonInput}
                      name={'jsonText'}
                      placeholder={t('jsonText', 'Enter JSON Text')}
                      showPrintMargin={true}
                      showGutter={true}
                      highlightActiveLine={true}
                      width="100%"
                      className={styles.jsonEditor}
                      setOptions={{
                        enableBasicAutocompletion: true,
                        enableLiveAutocompletion: true,
                        displayIndentGuides: true,
                        enableSnippets: false,
                        showLineNumbers: true,
                        tabSize: 2,
                      }}
                      defaultValue={defaultJson}
                    />

                    <div className={styles.renderField}>
                      <Dropdown
                        titleText={t('formIntent', 'Form Intent')}
                        label={t('selectForm', '--Select Form Intent')}
                        items={formIntents}
                        itemToString={(item) => item.display}
                        onChange={updateFormIntentInput}
                        disabled={isIntentsDropdownDisabled}
                      />
                    </div>

                    <div className={styles.renderField}>
                      <TextInput
                        labelText={t('encounterUuid', 'Encounter Uuid')}
                        placeholder={t('encounterUuidEntry', 'Enter Encounter Uuid')}
                        onChange={(e) => setEncounterUuid(e.target.value)}
                      />
                    </div>

                    <div className={styles.renderField}>
                      <Dropdown
                        titleText={t('jsonEditorThe', 'JSON Editor Theme')}
                        label={editorTheme}
                        items={availableEditorThemes}
                        itemToString={(item) => item}
                        onChange={(e) => {
                          setEditorTheme(e.selectedItem);
                        }}
                      />
                    </div>

                    <Button style={{ marginTop: '1em' }} renderIcon={UserData} onClick={formValidation}>
                      Validate Form
                    </Button>

                    <Button
                      type="submit"
                      renderIcon={Run}
                      className="form-group"
                      style={{ marginTop: '1em', marginLeft: '10px' }}
                      disabled={!selectedFormIntent}
                    >
                      {t('render', 'Render')}
                    </Button>
                  </Form>
                </TabPanel>
                <TabPanel>
                  <div className={styles.finalJsonSchema}>
                    <AceEditor
                      mode="json"
                      theme={editorTheme}
                      value={schemaOutput}
                      name={'json-schema-result'}
                      placeholder=""
                      showPrintMargin={true}
                      showGutter={true}
                      highlightActiveLine={true}
                      width="100%"
                      height="700px"
                      readOnly={true}
                      setOptions={{
                        enableBasicAutocompletion: false,
                        enableLiveAutocompletion: false,
                        displayIndentGuides: true,
                        enableSnippets: false,
                        showLineNumbers: true,
                        tabSize: 2,
                      }}
                    />
                  </div>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </div>
          <div style={{ width: windowSizeMode == 'maximized' ? '100%' : '50%' }}>
            <div className={styles.viewMode}>
              <h4>{t('generatedForm', 'Generated Form')}</h4>
              <Button renderIcon={Maximize} className={isSchemaLoaded ? styles.show : ''} onClick={toggleViewMode}>
                {windowSizeMode == 'minimized' ? 'Maximize' : 'Minimize'}
              </Button>
            </div>
            <div className={styles.formRenderContent}>
              <h5 style={{ color: 'orange', marginBottom: '1rem' }}>{outputErrorMessage}</h5>
              <Tabs>
                <TabList contained>
                  <Tab>{t('formRender', 'Form Render')}</Tab>
                </TabList>
                <TabPanels>
                  <TabPanel className={styles.renderTab}>
                    {isSchemaLoaded ? (
                      <div className={styles.formRenderDisplay}>
                        <FormEngine
                          formJson={formInput}
                          patientUUID={patientUuid}
                          mode={encounterUuid ? 'edit' : 'enter'}
                          encounterUUID={encounterUuid}
                        />
                      </div>
                    ) : (
                      <p>{t('submitForm', 'Please submit the form')}</p>
                    )}
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FormRenderTest;
