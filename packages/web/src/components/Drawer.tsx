import React, { useCallback } from 'react';
import { BaseProps } from '../@types/common';
import { Link, useLocation } from 'react-router-dom';
import useDrawer from '../hooks/useDrawer';
import ButtonIcon from './ButtonIcon';
import { PiSignOut, PiX, PiGithubLogo } from 'react-icons/pi';
import { ReactComponent as MLLogo } from '../assets/model.svg';
import ChatList from './ChatList';

type ItemProps = BaseProps & {
  label: string;
  to: string;
  icon: JSX.Element;
};

const Item: React.FC<ItemProps> = (props) => {
  const location = useLocation();
  const { switchOpen } = useDrawer();

  // 狭い画面の場合は、クリックしたらDrawerを閉じる
  const onClick = useCallback(() => {
    if (
      document
        .getElementById('smallDrawerFiller')
        ?.classList.contains('visible')
    ) {
      switchOpen();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Link
      className={`hover:bg-aws-sky m-2 flex h-8 items-center rounded p-2 ${
        location.pathname === props.to && 'bg-aws-sky'
      } ${props.className}`}
      to={props.to}
      onClick={onClick}>
      <span className="mr-2">{props.icon}</span>
      <span>{props.label}</span>
    </Link>
  );
};

type RefLinkProps = BaseProps & {
  label: string;
  to: string;
  icon: JSX.Element;
};

const RefLink: React.FC<RefLinkProps> = (props) => {
  const { switchOpen } = useDrawer();

  // 狭い画面の場合は、クリックしたらDrawerを閉じる
  const onClick = useCallback(() => {
    if (
      document
        .getElementById('smallDrawerFiller')
        ?.classList.contains('visible')
    ) {
      switchOpen();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Link
      className={`m-2 flex h-6 items-center rounded px-1 py-2 ${props.className}`}
      to={props.to}
      onClick={onClick}
      target="_blank">
      <div className="mr-1 flex h-6 w-6 items-center justify-center">
        {props.icon}
      </div>
      <div>{props.label}</div>
    </Link>
  );
};

type Props = BaseProps & {
  signOut: () => void;
  items: ItemProps[];
};

const Drawer: React.FC<Props> = (props) => {
  const { opened, switchOpen } = useDrawer();

  return (
    <>
      <nav
        className={`h-full lg:visible lg:w-64 ${
          opened ? 'visible w-64' : 'invisible w-0'
        } transition-width bg-aws-squid-ink fixed z-50 flex h-screen flex-col justify-between text-sm text-white lg:static lg:z-0`}>
        <div className="text-aws-smile mx-3 mt-3 text-xs">ツール</div>
        <div className="scrollbar-thin scrollbar-thumb-white  ml-2 mr-1 h-full overflow-y-auto border-b">
          {props.items.map((item, idx) => (
            <Item key={idx} label={item.label} icon={item.icon} to={item.to} />
          ))}
        </div>
        <div className="text-aws-smile mx-3 my-2  text-xs">会話履歴</div>
        <div className="scrollbar-thin scrollbar-thumb-white ml-2 mr-1 h-full overflow-y-auto">
          <ChatList className="mr-1" />
        </div>
        <div className="border-b" />
        <div className="mb-2">
          <div className="text-aws-smile mx-3 my-2 text-xs">リンク</div>

          <RefLink
            to="https://aws.amazon.com/jp/bedrock/"
            icon={<MLLogo className="w-4 fill-white" />}
            label="Bedrock"
          />
          <RefLink
            to="https://github.com/aws-samples/generative-ai-use-cases-jp"
            icon={<PiGithubLogo className="text-base" />}
            label="GitHub"
          />
        </div>
        <div className="flex justify-end border-t border-gray-400 p-3">
          <ButtonIcon onClick={props.signOut}>
            <PiSignOut className="text-base" />
            <span className="ml-1 text-sm">サインアウト</span>
          </ButtonIcon>
        </div>
      </nav>

      {opened && (
        <div id="smallDrawerFiller" className="visible lg:invisible">
          <ButtonIcon
            className="fixed left-64 top-0 z-50 text-white"
            onClick={switchOpen}>
            <PiX />
          </ButtonIcon>
          <div
            className="fixed z-40 h-screen w-screen bg-gray-900/90"
            onClick={switchOpen}></div>
        </div>
      )}
    </>
  );
};

export default Drawer;
