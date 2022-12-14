import type { NextPage } from 'next'
import Head from 'next/head'
import classnames from 'classnames'
import { CalendarDaysIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import TextareaAutosize from 'react-textarea-autosize'
import dayjs from 'dayjs'
import {
  supabase,
  throttle,
  useIntersectionObserver,
  useObjectState
} from 'services'
import { useEffect } from 'react'

interface State {
  list: {
    [date: string]: Learns[]
  }
  content: string
  isLoading: boolean
  category: string
  page: number
  isBackTopVisible: boolean
  isLoggedIn: boolean
}

const HomePage: NextPage = () => {
  const [
    { list, content, isLoading, category, page, isBackTopVisible, isLoggedIn },
    setState,
    onChange
  ] = useObjectState<State>({
    list: {},
    content: '',
    isLoading: false,
    category: '',
    page: 0,
    isBackTopVisible: false,
    isLoggedIn: false
  })
  const [ref, isIntersecting] = useIntersectionObserver<HTMLDivElement>()

  const get = async (page: number = 1) => {
    try {
      const { data } = await supabase
        .from<Learns>('learns')
        .select('*')
        .order('created_at', { ascending: false })
        .lt(
          'created_at',
          dayjs()
            .subtract((page - 1) * 5, 'day')
            .format('YYYY-MM-DDT23:59:59')
        )
        .gt(
          'created_at',
          dayjs()
            .subtract(page * 5 - 1, 'day')
            .format('YYYY-MM-DDT00:00:00')
        )
      let newList: { [date: string]: Learns[] } = {}
      data
        ?.map((item) => ({
          ...item,
          created_at: dayjs(item.created_at).format('YYYY-MM-DD')
        }))
        .forEach((item) => {
          const value = newList[item.created_at]
          if (value) newList[item.created_at] = [...value, item]
          else newList[item.created_at] = [item]
        }) || []
      setState({ page, list: { ...list, ...newList } })
    } catch (err) {
      console.error(err)
    }
  }

  const onLogin = async () => {
    try {
      await supabase.auth.signIn(
        { email: process.env.NEXT_PUBLIC_EMAIL },
        {
          redirectTo:
            process.env.NODE_ENV === 'development'
              ? 'http://localhost:3004'
              : 'https://til.kidow.me'
        }
      )
    } catch (err) {
      console.error(err)
    }
  }

  const onLogout = async () => {
    try {
      await supabase.auth.signOut()
      setState({ isLoggedIn: false })
    } catch (err) {
      console.error(err)
    }
  }

  const onScroll = throttle(() => {
    setState({ isBackTopVisible: document.documentElement.scrollTop > 400 })
  }, 100)

  const onSubmit = async () => {
    if (!content || !isLoggedIn) return
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

  const onCategoryChange = async (
    id: number,
    category: string,
    index: number
  ) => {
    try {
      await supabase.from<Learns>('learns').update({ category }).eq('id', id)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') setState({ isLoggedIn: true })
    })
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (isIntersecting) get(page + 1)
  }, [isIntersecting])
  return (
    <>
      <Head>
        <title>Today I Learned - Kidow</title>
      </Head>

      <header className="sticky top-0 mx-auto flex h-12 max-w-lg items-center justify-end gap-2 px-5 md:px-0">
        <button className="z-10 rounded-full bg-zinc-900 p-2 hover:bg-zinc-700 hover:text-zinc-100 active:bg-zinc-800">
          <CalendarDaysIcon className="h-5 w-5" />
        </button>
        {isLoggedIn ? (
          <button onClick={onLogout} className="text-sm">
            Logout
          </button>
        ) : (
          <button className="text-sm" onClick={onLogin}>
            Login
          </button>
        )}
      </header>

      <div className="relative mx-auto mb-8 max-w-lg px-5 text-sm md:px-0">
        <div className="absolute top-2 left-2 flex w-full items-center justify-between pr-5">
          <select
            className="bg-transparent"
            value={category}
            name="category"
            onChange={onChange}
          >
            <option disabled selected value="">
              ????????????
            </option>
            <option value="??????">??????</option>
            <option value="?????????">?????????</option>
            <option value="?????????">?????????</option>
            <option value="??????">??????</option>
            <option value="???">???</option>
            <option value="??????">??????</option>
            <option value="??????">??????</option>
          </select>
          <button
            onClick={onSubmit}
            disabled={isLoading || !content}
            className={classnames('duration-150 disabled:text-zinc-600', {
              'text-zinc-50': !!content
            })}
          >
            ??????
          </button>
        </div>
        <TextareaAutosize
          value={content}
          name="content"
          onChange={onChange}
          className="w-full rounded border border-zinc-600 px-3 pt-8 pb-2 focus:border-zinc-200"
          spellCheck={false}
          placeholder="?????? ?????? ???????"
        />
      </div>

      {Object.keys(list).map((createdAt) => {
        const data = list[createdAt]
        return (
          <div key={createdAt} className="mx-auto mb-8 max-w-lg px-5 md:px-0">
            <div className="mb-2 text-2xl">{createdAt}</div>
            <ul className="space-y-2">
              {data.map((item, key) => (
                <li key={key} className="flex items-start gap-2">
                  <select
                    value={item.category}
                    disabled={!isLoggedIn}
                    className="bg-transparent"
                    onChange={async (e) => {
                      try {
                        await supabase
                          .from<Learns>('learns')
                          .update({ category: e.target.value })
                          .eq('id', item.id)
                        setState({
                          list: {
                            ...list,
                            [createdAt]: [
                              ...list[createdAt].slice(0, key),
                              { ...item, category: e.target.value },
                              ...list[createdAt].slice(key + 1)
                            ]
                          }
                        })
                      } catch (err) {
                        console.error(err)
                      }
                    }}
                  >
                    <option value="??????">??????</option>
                    <option value="?????????">?????????</option>
                    <option value="?????????">?????????</option>
                    <option value="??????">??????</option>
                    <option value="???">???</option>
                    <option value="??????">??????</option>
                    <option value="??????">??????</option>
                  </select>
                  <TextareaAutosize
                    spellCheck={false}
                    readOnly={!item.isUpdateMode}
                    className={classnames(
                      'w-full flex-1 resize-none text-zinc-400 duration-100 hover:bg-zinc-800',
                      item.isUpdateMode ? 'cursor-text' : 'cursor-pointer'
                    )}
                    disabled={!isLoggedIn}
                    onClick={() =>
                      setState({
                        list: {
                          ...list,
                          [createdAt]: [
                            ...list[createdAt].slice(0, key),
                            { ...item, isUpdateMode: !item.isUpdateMode },
                            ...list[createdAt].slice(key + 1)
                          ]
                        }
                      })
                    }
                    value={item.content}
                    name="content"
                    onChange={(e) =>
                      setState({
                        list: {
                          ...list,
                          [createdAt]: [
                            ...list[createdAt].slice(0, key),
                            { ...item, content: e.target.value },
                            ...list[createdAt].slice(key + 1)
                          ]
                        }
                      })
                    }
                    onBlur={async () => {
                      try {
                        await supabase
                          .from<Learns>('learns')
                          .update({ content: item.content })
                          .eq('id', item.id)
                        setState({
                          list: {
                            ...list,
                            [createdAt]: [
                              ...list[createdAt].slice(0, key),
                              { ...item, isUpdateMode: false },
                              ...list[createdAt].slice(key + 1)
                            ]
                          }
                        })
                      } catch (err) {
                        console.error(err)
                      }
                    }}
                  />
                </li>
              ))}
            </ul>
          </div>
        )
      })}

      {isBackTopVisible && (
        <button
          className={classnames(
            'fixed bottom-5 right-5 flex h-12 w-12 items-center justify-center rounded-full bg-gray-900 duration-150 hover:bg-black',
            isBackTopVisible ? 'scale-100' : 'scale-0'
          )}
          onClick={() => window.scrollTo(0, 0)}
          tabIndex={0}
        >
          <ChevronUpIcon className="h-7 w-7 text-white" />
        </button>
      )}

      <div ref={ref} />
    </>
  )
}

export default HomePage
