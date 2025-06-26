FROM node:16.20.2

LABEL authors="yckj"

# 设置时区为北京时间
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8

WORKDIR /sunday/lianjin_game/china_chess

ADD . /sunday/lianjin_game/china_chess/

RUN npm install --verbose

EXPOSE 9005
#
ENTRYPOINT ["npm", "start"]
