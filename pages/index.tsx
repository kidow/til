import type { NextPage } from 'next'
import Head from 'next/head'
import classnames from 'classnames'
import { CalendarDaysIcon } from '@heroicons/react/24/outline'
import TextareaAutosize from 'react-textarea-autosize'
import dayjs from 'dayjs'
import { supabase, throttle, useObjectState } from 'services'
import { useCallback, useEffect } from 'react'
import { useRouter } from 'next/router'

interface State {
  list: Learns[]
  content: string
  isLoading: boolean
  category: string
  scrollTop: number
}

const HomePage: NextPage = () => {
  const [
    { list, content, isLoading, category, scrollTop },
    setState,
    onChange
  ] = useObjectState<State>({
    list: [],
    content: '',
    isLoading: false,
    category: '',
    scrollTop: 0
  })
  const { push } = useRouter()

  const get = async () => {
    try {
      const { data } = await supabase.from<Learns>('learns').select('*')
      console.log('data', data)
      setState({ list: data || [] })
    } catch (err) {
      console.error(err)
    }
  }

  const onScroll = useCallback(
    throttle(() => {
      setState({ scrollTop: document.documentElement.scrollTop })
    }, 100),
    [scrollTop]
  )

  const onSubmit = async () => {
    if (!content) return
    setState({ isLoading: true })
    try {
      await supabase.from<Learns>('learns').insert({ content, category })
      setState({ content: '', category: '' })
      get()
    } catch (err) {
      console.error(err)
    } finally {
      setState({ isLoading: false })
    }
  }

  const isActive = (id: string, index: number): boolean => {
    if (typeof window === 'undefined' || typeof document === 'undefined')
      return false

    const element = document.getElementById(id)
    if (!element) return false

    const nextElement = document.getElementById(
      dayjs(id).add(-1, 'day').format('YYYYMMDD')
    )
    if (!nextElement) return false
    const isOver = scrollTop >= element.offsetTop - 8
    const isNextUnder = scrollTop < nextElement.offsetTop - 8

    return isOver && isNextUnder
  }

  useEffect(() => {
    get()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <>
      <Head>
        <title>Today I Learned - Kidow</title>
      </Head>

      <header className="sticky top-0 mx-auto flex h-12 max-w-lg items-center justify-end px-5 md:px-0">
        <button className="z-10 rounded-full bg-zinc-900 p-2 hover:bg-zinc-700 hover:text-zinc-100 active:bg-zinc-800">
          <CalendarDaysIcon className="h-5 w-5" />
        </button>
      </header>

      <div className="relative mx-auto max-w-lg px-5 text-sm md:px-0">
        <div className="absolute top-2 left-2 flex w-full items-center justify-between pr-5">
          <select
            className="bg-transparent"
            value={category}
            name="category"
            onChange={onChange}
          >
            <option disabled selected value="">
              선택
            </option>
            <option value="개발">개발</option>
            <option value="디자인">디자인</option>
            <option value="마케팅">마케팅</option>
            <option value="경영">경영</option>
            <option value="기타">기타</option>
          </select>
          <button
            onClick={onSubmit}
            disabled={isLoading}
            className={classnames('duration-150', {
              'text-blue-500': !!content
            })}
          >
            전송
          </button>
        </div>
        <TextareaAutosize
          value={content}
          name="content"
          onChange={onChange}
          className="w-full rounded border border-zinc-600 px-3 pt-8 pb-2 focus:border-zinc-200"
          spellCheck={false}
          placeholder="오늘 배운 것은?"
        />
      </div>

      {Array.from({ length: 30 }).map((_, key) => {
        const id = dayjs().subtract(key, 'day').format('YYYYMMDD')
        return (
          <div
            key={key}
            id={id}
            className={classnames(
              'top-2 mx-auto mb-8 max-w-lg bg-zinc-900 px-5 md:px-0',
              {
                sticky: isActive(id, key)
              }
            )}
            onClick={() => push(`/#${id}`)}
          >
            <div className="text-2xl">
              {dayjs().subtract(key, 'day').format('YYYY-MM-DD')}
            </div>
            <ul className="list-inside list-disc p-2">
              <li className="">이것 저것</li>
            </ul>
          </div>
        )
      })}
    </>
  )
}

export default HomePage
