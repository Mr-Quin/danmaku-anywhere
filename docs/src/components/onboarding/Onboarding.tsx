import { useEffect, useState } from 'react'

import { Alert } from '../Alert.tsx'

import { TestVideo } from './TestVideo.tsx'
import { getHasExtension, useConfig } from './useConfig.tsx'
import { useOpenController } from './useOpenController.tsx'

export const Onboarding = () => {
  const hasExtension = getHasExtension()
  const { hasConfig, loaded, error, createConfig } = useConfig()

  const [step, setStep] = useState(0)

  const { hasController } = useOpenController(step === 1)

  const highlightStep = (stepNumber: number) => {
    if (step >= stepNumber) return 'step-primary'
    return 'step-neutral'
  }

  const getStepContent = (stepNumber: number) => {
    if (step > stepNumber) return '✓'
    return undefined
  }

  useEffect(() => {
    if (hasConfig && step === 0) {
      setStep(1)
    }
  }, [hasConfig])

  const steps = [
    {
      title: '第一步：添加装填配置',
      content: () => {
        if (error) {
          return (
            <Alert type="error">
              <div>
                <p className="font-bold">出错了！</p>
                <p className="text-sm">{error}</p>
              </div>
            </Alert>
          )
        }

        if (hasConfig)
          return (
            <Alert type="success">
              <span>成功添加装填配置！</span>
              <button className="btn" onClick={() => setStep(step + 1)}>
                继续
              </button>
            </Alert>
          )

        if (!loaded) {
          return (
            <span className="loading loading-spinner loading-lg text-primary"></span>
          )
        }

        return (
          <button
            className="btn btn-primary"
            onClick={createConfig}
            disabled={!hasExtension || hasConfig}
          >
            添加测试装填配置
          </button>
        )
      },
      canNext: () => hasConfig,
    },
    {
      title: '第二步：确认控件加载',
      content: () => {
        if (!hasController) {
          return (
            <div>
              <p>
                正在等待控件加载，如果长时间没有加载，请检查控制台是否有错误日志
              </p>
              <span className="loading loading-dots loading-lg text-primary mt-2"></span>
            </div>
          )
        }

        return (
          <>
            <Alert type="success">
              <span>控件已加载！</span>
              <button className="btn" onClick={() => setStep(step + 1)}>
                继续
              </button>
            </Alert>
            <p className="mt-2">
              控件可以通过左下角的按钮打开，点击页面其他地方关闭。关闭时，鼠标静止一段时间后会自动隐藏图标。
            </p>
          </>
        )
      },
      canNext: () => hasController,
    },
    {
      title: '第三步：测试弹幕',
      content: () => {
        return (
          <div>
            <TestVideo />
            <p></p>
          </div>
        )
      },
      canNext: () => false,
    },
  ]

  const renderContent = () => {
    if (!hasExtension) {
      return <p>扩展未安装，请先请先安装扩展</p>
    }

    return (
      <div>
        <h3>{steps[step].title}</h3>
        <div className="mt-2">{steps[step].content()}</div>
      </div>
    )
  }

  return (
    <div className="p-4 my-4 bg-gray-800 rounded not-content">
      <div className="flex flex-col justify-center">
        {renderContent()}
        {hasExtension && (
          <>
            <div className="divider" />
            <div className="flex justify-between align-middle">
              <button
                className="btn btn-outline btn-primary"
                onClick={() => setStep(step - 1)}
                disabled={!hasConfig || step === 0}
              >
                上一步
              </button>
              <button
                className="btn btn-outline btn-primary"
                onClick={() => setStep(step + 1)}
                disabled={!hasConfig || !steps[step].canNext()}
              >
                下一步
              </button>
            </div>
            <div className="divider" />
            <ul className="steps">
              <li
                data-content={getStepContent(0)}
                className={`step ${highlightStep(0)}`}
              >
                添加装填配置
              </li>
              <li
                data-content={getStepContent(1)}
                className={`step ${highlightStep(1)}`}
              >
                确认控件加载
              </li>
              <li
                data-content={getStepContent(2)}
                className={`step ${highlightStep(2)}`}
              >
                测试弹幕
              </li>
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
