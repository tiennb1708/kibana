/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useMemo, useCallback, FormEventHandler } from 'react';

import useObservable from 'react-use/lib/useObservable';

import {
  EuiSpacer,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiText,
  EuiForm,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { extractErrorMessage } from '@kbn/ml-error-utils';

import { ErrorMessage } from '../../inference_error';
import type { InferrerType } from '..';
import { useIndexInput, InferenceInputFormIndexControls } from '../index_input';
import { RUNNING_STATE } from '../inference_base';
import { InputFormControls } from './input_form_controls';
import { useTestTrainedModelsContext } from '../../test_trained_models_context';

interface Props {
  inferrer: InferrerType;
}

export const IndexInputForm: FC<Props> = ({ inferrer }) => {
  const {
    currentContext: { defaultSelectedDataViewId, createPipelineFlyoutOpen },
  } = useTestTrainedModelsContext();

  const data = useIndexInput({
    inferrer,
    defaultSelectedDataViewId,
  });
  const { reloadExamples, selectedField } = data;

  const [errorText, setErrorText] = useState<string | null>(null);
  const runningState = useObservable(inferrer.getRunningState$(), inferrer.getRunningState());
  const examples = useObservable(inferrer.getInputText$(), inferrer.getInputText());
  const isValid = useObservable(inferrer.getIsValid$(), inferrer.getIsValid());
  const outputComponent = useMemo(() => inferrer.getOutputComponent(), [inferrer]);
  const infoComponent = useMemo(() => inferrer.getInfoComponent(), [inferrer]);

  const run: FormEventHandler<HTMLFormElement> = useCallback(
    async (event) => {
      event.preventDefault();
      setErrorText(null);
      try {
        await inferrer.infer();
      } catch (e) {
        setErrorText(extractErrorMessage(e));
      }
    },
    [inferrer]
  );

  return (
    <EuiForm component={'form'} onSubmit={run}>
      <>{infoComponent}</>
      <InferenceInputFormIndexControls
        inferrer={inferrer}
        data={data}
        disableIndexSelection={defaultSelectedDataViewId !== undefined}
      />

      <EuiSpacer size="m" />

      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup>
            <InputFormControls
              testButtonDisabled={runningState === RUNNING_STATE.RUNNING || isValid === false}
              createPipelineButtonDisabled={
                runningState === RUNNING_STATE.RUNNING || isValid === false
              }
              showCreatePipelineButton={!createPipelineFlyoutOpen}
              inferrer={inferrer}
            />
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {runningState === RUNNING_STATE.RUNNING ? <EuiLoadingSpinner size="xl" /> : null}
        </EuiFlexItem>
        <EuiFlexItem />
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            onClick={reloadExamples}
            disabled={runningState === RUNNING_STATE.RUNNING || selectedField === undefined}
          >
            <FormattedMessage
              id="xpack.ml.trainedModels.testModelsFlyout.inferenceInputForm.reloadButton"
              defaultMessage="Reload examples"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />

      {errorText !== null || runningState === RUNNING_STATE.FINISHED_WITH_ERRORS ? (
        <>
          <ErrorMessage errorText={errorText} />
          <EuiSpacer />
        </>
      ) : null}

      {runningState !== RUNNING_STATE.FINISHED
        ? examples.map((example) => (
            <>
              <EuiText size="s">{example}</EuiText>
              <EuiHorizontalRule />
            </>
          ))
        : null}

      {runningState === RUNNING_STATE.FINISHED ? <>{outputComponent}</> : null}
    </EuiForm>
  );
};
